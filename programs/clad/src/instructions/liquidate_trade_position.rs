use {
    crate::{
        errors,
        manager::{
            liquidity_manager::calculate_liquidity_token_deltas,
            swap_manager::execute_jupiter_swap_for_globalpool,
        },
        state::*,
        util::transfer_from_vault_to_owner,
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
};

#[derive(Accounts)]
#[instruction(params: LiquidateTradePositionParams)]
pub struct LiquidateTradePosition<'info> {
    #[account(mut)]
    pub liquidator: Signer<'info>,

    /// CHECK: for validating position token only
    #[account(mut)]
    pub position_authority: Signer<'info>,

    pub globalpool: Box<Account<'info, Globalpool>>,

    #[account(mut, has_one = globalpool)]
    pub position: Box<Account<'info, TradePosition>>,

    #[account(mut, address = position.position_mint)]
    pub position_mint: Account<'info, Mint>,

    #[account(
        associated_token::mint = position_mint,
        associated_token::authority = position_authority,
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        // constraint = token_authority_account_a.mint == globalpool.token_mint_a
        token::mint = globalpool.token_mint_a,
        token::authority = position_authority,
    )]
    pub token_authority_account_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = globalpool.token_mint_a,
        token::authority = liquidator,
    )]
    pub token_liquidator_account_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(address = globalpool.token_mint_a)]
    pub token_mint_a: Box<Account<'info, Mint>>,

    #[account(
        mut,
        // constraint = token_authority_account_b.mint == globalpool.token_mint_b
        token::mint = globalpool.token_mint_b,
        token::authority = position_authority,
    )]
    pub token_authority_account_b: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = globalpool.token_mint_b,
        token::authority = liquidator,
    )]
    pub token_liquidator_account_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(address = globalpool.token_mint_b)]
    pub token_mint_b: Box<Account<'info, Mint>>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    // For pyth
    // pub clock: Sysvar<'info, Clock>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LiquidateTradePositionParams {
    pub swap_instruction_data: Vec<u8>, // Jupiter swap data
}

pub fn liquidate_trade_position(
    ctx: Context<LiquidateTradePosition>,
    params: &LiquidateTradePositionParams,
) -> Result<()> {
    // if !(ctx.accounts.position.has_matured()?) {
    //     return Err(ErrorCode::LoanNotMatured.into());
    // }

    let is_borrow_a = ctx.accounts.position.is_borrow_a(&ctx.accounts.globalpool);

    let liquidity_borrowed = ctx.accounts.position.liquidity_borrowed;
    let collateral_amount = ctx.accounts.position.collateral_amount;
    let trade_token_amount = ctx.accounts.position.trade_token_amount;
    let loan_token_swapped = ctx.accounts.position.loan_token_swapped;
    let tick_lower_index = ctx.accounts.position.tick_lower_index;
    let tick_upper_index = ctx.accounts.position.tick_upper_index;
    let tick_current_index = ctx.accounts.globalpool.tick_current_index;
    let sqrt_current_price = ctx.accounts.globalpool.sqrt_price;

    let (repay_delta_a, repay_delta_b) = calculate_liquidity_token_deltas(
        tick_lower_index,
        tick_upper_index,
        tick_current_index,
        sqrt_current_price,
        liquidity_borrowed as i128,
    )?;

    // This assumes the position has swapped all of loan token to the opposite (trade) token.
    let (borrowed_delta_a, borrowed_delta_b) = if is_borrow_a {
        (loan_token_swapped, 0)
    } else {
        (0, loan_token_swapped)
    };

    // let outstanding_delta_a = repay_delta_a as i64 - borrowed_delta_a as i64;
    // let outstanding_delta_b = repay_delta_b as i64 - borrowed_delta_b as i64;

    // This assumes the position has swapped all of loan token to the opposite (trade) token.
    let (mut available_delta_a, mut available_delta_b) = if is_borrow_a {
        (0, trade_token_amount + collateral_amount)
    } else {
        (trade_token_amount + collateral_amount, 0)
    };

    let swap_needed_delta_a =
        std::cmp::max(0, repay_delta_a as i64 - available_delta_a as i64) as u64;
    let swap_needed_delta_b =
        std::cmp::max(0, repay_delta_b as i64 - available_delta_b as i64) as u64;

    // If both values are non-zero, then the position is undercollateralized.
    // This is a logic issue in the program and should NOT happen at all.
    //
    // For readers: Why is it that only one of the swap_needed_delta_a/b can be non-zero?
    // (1) When the position is in loss, LP's expected token is in collateral token (also the trader's swapped token)
    // (2) When the position is in profit, trader can convert some profit into loaned token and repay the loan.
    // (3) When the position is in range, because of (1), the collateral token + borrowed position's current token liquidity covers one of the token's borrowed amount.
    if swap_needed_delta_a != 0 && swap_needed_delta_b != 0 {
        return Err(errors::ErrorCode::InvalidRepaymentAmount.into());
    }

    let mut swap_in_before_balance: u64 = 0;
    let mut swap_out_before_balance: u64 = 0;
    let mut swap_in_after_balance: u64 = 0;
    let mut swap_out_after_balance: u64 = 0;
    let mut swap_out_needed: u64 = 0;

    // Should swap exact out if one of the above conditions are met
    if swap_needed_delta_a > 0 || swap_needed_delta_b > 0 {
        // Trade token as in the token that was swapped to from loaned token
        // e.g. loaned USDC, swapped to SOL for long position => SOL is trade token.
        // Trade token is also the collateral token, due to the way AMM converts token for LPs.
        let trade_token_before_balance = if is_borrow_a {
            ctx.accounts.token_vault_b.amount
        } else {
            ctx.accounts.token_vault_a.amount
        };

        if swap_needed_delta_a > 0 {
            // Need more A. Swap from token B to token A
            swap_in_before_balance = ctx.accounts.token_vault_b.amount;
            swap_out_before_balance = ctx.accounts.token_vault_a.amount;
            swap_out_needed = swap_needed_delta_a;
        } else if swap_needed_delta_b > 0 {
            // Need more B. Swap from token A to token B
            swap_in_before_balance = ctx.accounts.token_vault_a.amount;
            swap_out_before_balance = ctx.accounts.token_vault_b.amount;
            swap_out_needed = swap_needed_delta_b;
        }

        // 1. Swap
        execute_jupiter_swap_for_globalpool(
            &ctx.accounts.globalpool,
            &ctx.remaining_accounts,
            &params.swap_instruction_data,
        )?;

        // 2. Validate output
        // (i) swap_out_token_vault must increase by `swap_needed_delta`
        // (ii) NEED more check on swap_in_token_vault...

        // Reload vaults for get updated token balances
        ctx.accounts.token_vault_a.reload()?;
        ctx.accounts.token_vault_b.reload()?;

        let trade_token_after_balance = if is_borrow_a {
            ctx.accounts.token_vault_b.amount
        } else {
            ctx.accounts.token_vault_a.amount
        };

        if swap_needed_delta_a > 0 {
            // Need more A. Swap from token B to token A
            swap_in_after_balance = ctx.accounts.token_vault_b.amount;
            swap_out_after_balance = ctx.accounts.token_vault_a.amount;
        } else if swap_needed_delta_b > 0 {
            // Need more B. Swap from token A to token B
            swap_in_after_balance = ctx.accounts.token_vault_a.amount;
            swap_out_after_balance = ctx.accounts.token_vault_b.amount;
        }

        // Balances should increase & decrease correctly in direction (magnitude is not checked here)
        require!(
            (swap_in_after_balance < swap_in_before_balance)
                && (swap_out_after_balance > swap_out_before_balance),
            errors::ErrorCode::InvalidLoanTradeSwapDirection
        );

        // Swap out balance should increase exactly by `swap_out_needed` (swap_needed_delta_a or swap_needed_delta_b)
        require!(
            swap_out_after_balance == swap_out_before_balance + swap_out_needed,
            errors::ErrorCode::InvalidLoanTradeSwapResult
        );

        // TODO: swap in precise token amount change requirement
        // require!( // swap result in (not a really good check, need more specific number)
        //     swap_in_after_balance < swap_in_before_balance,
        //     errors::ErrorCode::InvalidLoanTradeSwapResult
        // );

        // Trade token should decrease by at most `trade_token_amount + collateral_amount` (if used for swap)
        // which is also used above in `available_delta_a` or `available_delta_b`
        require!(
            // collateral vault should decrease by at most
            trade_token_after_balance + trade_token_amount + collateral_amount
                >= trade_token_before_balance,
            errors::ErrorCode::InvalidLoanTradeSwapResult
        );

        let swap_in_amount = swap_in_before_balance - swap_in_after_balance;

        // Update available token amounts to reflect the swap_in sent & swap_out received
        if is_borrow_a {
            // Swapped from token B to token A
            available_delta_b -= swap_in_amount;
            available_delta_a += swap_out_needed;
        } else {
            // Swap from token A to token B
            available_delta_a -= swap_in_amount;
            available_delta_b += swap_out_needed;
        }
    }

    // Only one of these tokens will be > 0. Otherwise, there's a logic issue in the program!
    let mut leftover_token_a: u64 = 0;
    let mut leftover_token_b: u64 = 0;

    if available_delta_a > repay_delta_a {
        leftover_token_a = available_delta_a - repay_delta_a;
    }

    if available_delta_b > repay_delta_b {
        leftover_token_b = available_delta_b - repay_delta_b;
    }

    msg!("available_delta_a: {}", available_delta_a);
    msg!("repay_delta_a:     {}", repay_delta_a);
    msg!("left_over_token_a: {}", leftover_token_a);
    msg!("available_delta_b: {}", available_delta_b);
    msg!("repay_delta_b:     {}", repay_delta_b);
    msg!("left_over_token_b: {}", leftover_token_b);
    msg!("collateral_amount: {}", collateral_amount);

    if is_borrow_a {
        leftover_token_b += collateral_amount;
    } else {
        leftover_token_a += collateral_amount;
    }

    msg!("left_over_token_a: {}", leftover_token_a);
    msg!("left_over_token_b: {}", leftover_token_b);

    // ctx.accounts
    //     .position
    //     .update_liquidity_swapped(-(loan_token_swapped as i64), -(trade_token_amount as i64))?;

    // if is_borrow_a {
    //     ctx.accounts
    //         .position
    //         .update_collateral_amount(leftover_token_b)?;
    // } else {
    //     ctx.accounts
    //         .position
    //         .update_collateral_amount(leftover_token_a)?;
    // }

    Ok(())
}
