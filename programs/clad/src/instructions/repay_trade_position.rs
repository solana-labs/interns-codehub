use {
    crate::{
        errors,
        manager::{
            liquidity_manager::{self, calculate_liquidity_token_deltas},
            loan_manager,
            swap_manager::execute_jupiter_swap_for_globalpool,
        },
        state::*,
        util::{transfer_from_vault_to_owner, verify_position_authority},
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
};

#[derive(Accounts)]
#[instruction(params: RepayTradePositionParams)]
pub struct RepayTradePosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub globalpool: Box<Account<'info, Globalpool>>,

    #[account(mut, has_one = globalpool)]
    pub position: Box<Account<'info, TradePosition>>,

    #[account(
        associated_token::mint = position.position_mint,
        associated_token::authority = owner,
	)]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_a.mint == globalpool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(address = globalpool.token_mint_a)]
    pub token_mint_a: Box<Account<'info, Mint>>,

    #[account(mut, constraint = token_owner_account_b.mint == globalpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(address = globalpool.token_mint_b)]
    pub token_mint_b: Box<Account<'info, Mint>>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_lower: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_upper: AccountLoader<'info, TickArray>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RepayTradePositionParams {
    pub swap_instruction_data: Vec<u8>, // Jupiter swap data
}

pub fn repay_trade_position(
    ctx: Context<RepayTradePosition>,
    params: &RepayTradePositionParams,
) -> Result<()> {
    verify_position_authority(&ctx.accounts.position_token_account, &ctx.accounts.owner)?;

    //
    // WARNING:
    //
    // When using the raw tick_current_index from the globalpool, an attacker can manipulate
    // the tick in tx T and repay the trade position in tx T+1, causing the program to use
    // tick_current_index that is unfavourable to the lender.
    //
    // This won't be problematic for pools with high liquidity, where it costs a lot to exploit,
    // but smaller pools are susceptible to this attack. It's like manipulating the spot price to
    // make an option contract in-the-money right before maturity (ie. option pinning).
    //
    // Potential Mitigation:
    // - Use TWAP of tick_current_index
    //

    //
    // Consider three cases of repaying (closing) a trade position.
    //
    // Assumptions:
    // - Price is at 1000 USDC/SOL when user swapped USDC to SOL.
    // - User borrowed in the liquidity range (850, 950).
    // - User borrowed 1000 USDC, then swapped it to 1 SOL for *long-SOL* position.
    // - User put in 0.1111 SOL (valued at 111.1 USDC) as collateral.
    // - Trivial slippage and fee incurred for swaps.
    //
    // Let P = SOL price (in USDC) at the time of repayment.
    //
    // (1) P >= 1000
    // Requirement: Repay 1000 USDC.
    // i. Swap at most 1 SOL to 1000 USDC via Jupiter.
    // ii. Repay 1000 USDC to globalpool & claim back full collateral.
    //
    // (2) P \in [950, 1000)
    // Requirement: Repay 1000 USDC.
    // i. Swap 1 SOL to at most 1000 USDC via Jupiter.
    // ii. Take some of SOL collateral and swap to USDC via Jupiter.
    // => Output of (i) & (ii) sums to 1000 USDC.
    // iii. Repay 1000 USDC to globalpool & claim back leftover collateral.
    //
    // (3) P \in (850, 950)
    // Requirement: Repay X USDC and Y SOL.
    // i. Swap < 1 SOL to X USDC via Jupiter.
    // ii. Take some of SOL collateral.
    // => (ii) + leftover from (i) sums to Y SOL.
    // iii. Repay X USDC and Y SOL.
    // iv. Claim back leftover collateral (0.1 SOL - (ii) SOL).
    //
    // (4) P <= 850
    // Requirement: Repay 1.1111 SOL (= 1000 / [(950+850)/2])
    // i. Repay 1 SOL + all of SOL collateral.
    //

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
    let (available_delta_a, available_delta_b) = if is_borrow_a {
        (0, trade_token_amount + collateral_amount)
    } else {
        (trade_token_amount + collateral_amount, 0)
    };

    let swap_needed_delta_a =
        std::cmp::max(0, repay_delta_a as i64 - available_delta_a as i64) as u64;
    let swap_needed_delta_b =
        std::cmp::max(0, repay_delta_b as i64 - available_delta_b as i64) as u64;

    msg!("repay_delta_a: {}", repay_delta_a);
    msg!("borrowed_delta_a: {}", borrowed_delta_a);
    msg!("available_delta_a: {}", available_delta_a);
    msg!("swap_needed_delta_a: {}", swap_needed_delta_a);
    msg!("repay_delta_b: {}", repay_delta_b);
    msg!("borrowed_delta_b: {}", borrowed_delta_b);
    msg!("available_delta_b: {}", available_delta_b);
    msg!("swap_needed_delta_b: {}", swap_needed_delta_b);

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

        msg!("out_needed:      {}", swap_out_needed);
        msg!("swap_in before:  {}", swap_in_before_balance);
        msg!("swap_in after:   {}", swap_in_after_balance);
        msg!(
            "diff:            {}",
            swap_in_before_balance - swap_in_after_balance
        );
        msg!("swap_out before: {}", swap_out_before_balance);
        msg!("swap_out after:  {}", swap_out_after_balance);
        msg!(
            "diff:            {}",
            swap_out_after_balance - swap_out_before_balance
        );

        // Balances should increase & decrease correctly in direction (magnitude is not checked here)
        require!(
            (swap_in_after_balance < swap_in_before_balance)
                && (swap_out_after_balance > swap_out_before_balance),
            errors::ErrorCode::InvalidLoanTradeSwapDirection
        );

        // Swap out balance should increase by swap_needed_delta
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
    }

    // Post-swap updates since the token amount hole is filled
    let available_delta_a = available_delta_a + swap_needed_delta_a;
    let available_delta_b = available_delta_b + swap_needed_delta_b;

    let mut leftover_token_a: u64 = 0;
    let mut leftover_token_b: u64 = 0;

    if repay_delta_a > available_delta_a {
        leftover_token_a = repay_delta_a - available_delta_a;
    }

    if repay_delta_b > available_delta_b {
        leftover_token_b = repay_delta_b - available_delta_b;
    }

    msg!("available_delta_a: {}", available_delta_a);
    msg!("repay_delta_a:     {}", repay_delta_a);
    msg!("left_over_token_a: {}", leftover_token_a);
    msg!("");
    msg!("available_delta_b: {}", available_delta_b);
    msg!("repay_delta_b:     {}", repay_delta_b);
    msg!("left_over_token_b: {}", leftover_token_b);

    if leftover_token_a > 0 {
        transfer_from_vault_to_owner(
            &ctx.accounts.globalpool,
            &ctx.accounts.token_vault_a,
            &ctx.accounts.token_owner_account_a,
            &ctx.accounts.token_program,
            leftover_token_a,
        )?;
    }

    if leftover_token_b > 0 {
        transfer_from_vault_to_owner(
            &ctx.accounts.globalpool,
            &ctx.accounts.token_vault_b,
            &ctx.accounts.token_owner_account_b,
            &ctx.accounts.token_program,
            leftover_token_b,
        )?;
    }

    ctx.accounts
        .position
        .update_liquidity_swapped(-(loan_token_swapped as i64), -(trade_token_amount as i64))?;
    ctx.accounts.position.update_collateral_amount(0)?;

    // Last param assumes that all loaned token was swapped to trade token `open_trade_position`
    let update = loan_manager::calculate_modify_loan(
        &ctx.accounts.globalpool,
        &ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        -(liquidity_borrowed as i128),
        -(loan_token_swapped as i64),
    )?;

    liquidity_manager::sync_modify_liquidity_values_for_loan(
        &mut ctx.accounts.globalpool,
        &mut ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        update,
    )?;

    // // Update globalpool's swapped token amount
    // ctx.accounts
    //     .globalpool
    //     .update_liquidity_trade_locked(swapped_amount_out, is_borrow_a)?;

    Ok(())
}
