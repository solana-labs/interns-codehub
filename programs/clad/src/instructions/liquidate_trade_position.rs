use {
    crate::{
        manager::{
            liquidity_manager::calculate_liquidity_token_deltas,
            swap_manager::execute_jupiter_swap_for_globalpool,
        },
        state::*,
        util::transfer_from_owner_to_vault,
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
    // Jupiter router params
    pub slippage_bps: u16,
    pub platform_fee_bps: u8,
    pub swap_instruction_data: Vec<u8>,
}

pub fn liquidate_trade_position(
    ctx: Context<LiquidateTradePosition>,
    _params: &LiquidateTradePositionParams,
) -> Result<()> {
    // if !(ctx.accounts.position.has_matured()?) {
    //     return Err(ErrorCode::LoanNotMatured.into());
    // }

    let is_borrow_a = ctx.accounts.position.is_borrow_a(&ctx.accounts.globalpool);
    let liquidity_borrowed = ctx.accounts.position.liquidity_borrowed;
    let loan_token_borrowed = ctx.accounts.position.loan_token_swapped;
    let trade_token_amount = ctx.accounts.position.trade_token_amount;

    msg!("liquidity_borrowed: {}", liquidity_borrowed);
    msg!("loan_token_borrowed: {}", loan_token_borrowed);
    msg!("trade_token_amount: {}", trade_token_amount);

    //
    // The flow is similar to `repay_trade_position`, excep that, instead of using Jupiter to swap within
    // the program, the liquidator acts as a middleman to swap the tokens. In return, the liquidator
    // gets the penalty fee (which was added as a buffer at the start of the loan).
    //

    // Calculate the amount of token A and token B to be repaid for the loan position
    let (delta_a, delta_b) = calculate_liquidity_token_deltas(
        ctx.accounts.position.tick_lower_index,
        ctx.accounts.position.tick_upper_index,
        ctx.accounts.globalpool.tick_current_index,
        ctx.accounts.globalpool.sqrt_price,
        liquidity_borrowed as i128,
    )?;

    let loan_token_vault;
    let trade_token_vault;
    let loan_token_liquidator;
    let trade_token_liquidator;
    let hole_loan_token;
    let hole_trade_token;

    if is_borrow_a {
        loan_token_vault = &ctx.accounts.token_vault_a;
        trade_token_vault = &ctx.accounts.token_vault_b;
        loan_token_liquidator = &ctx.accounts.token_liquidator_account_a;
        trade_token_liquidator = &ctx.accounts.token_liquidator_account_b;

        hole_loan_token = -(delta_a as i64);
        hole_trade_token = std::cmp::min(0, (trade_token_amount as i64) - (delta_b as i64));
    } else {
        loan_token_vault = &ctx.accounts.token_vault_b;
        trade_token_vault = &ctx.accounts.token_vault_a;
        loan_token_liquidator = &ctx.accounts.token_liquidator_account_b;
        trade_token_liquidator = &ctx.accounts.token_liquidator_account_a;

        hole_loan_token = std::cmp::min(0, (trade_token_amount as i64) - (delta_a as i64));
        hole_trade_token = -(delta_b as i64);
    }

    msg!("is_borrow_a: {}", is_borrow_a);
    msg!("liquidate delta_a: {}", delta_a);
    msg!("liquidate delta_b: {}", delta_b);
    msg!("liquidate hole_loan_token: {}", hole_loan_token);
    msg!("liquidate hole_trade_token: {}", hole_trade_token);

    if hole_loan_token < 0 {
        transfer_from_owner_to_vault(
            &ctx.accounts.liquidator,
            loan_token_liquidator,
            loan_token_vault,
            &ctx.accounts.token_program,
            hole_loan_token.abs() as u64,
        )?;
    }

    if hole_trade_token < 0 {
        transfer_from_owner_to_vault(
            &ctx.accounts.liquidator,
            trade_token_liquidator,
            trade_token_vault,
            &ctx.accounts.token_program,
            hole_trade_token.abs() as u64,
        )?;
    }

    //
    // 1. Transfer tokens from the liquidator directly to the token vaults
    //

    // if delta_a > 0 {
    //     transfer_from_owner_to_vault(
    //         &ctx.accounts.liquidator,
    //         &ctx.accounts.token_liquidator_account_a,
    //         &ctx.accounts.token_vault_a,
    //         &ctx.accounts.token_program,
    //         delta_a,
    //     )?;
    // }

    // if delta_b > 0 {
    //     transfer_from_owner_to_vault(
    //         &ctx.accounts.liquidator,
    //         &ctx.accounts.token_liquidator_account_b,
    //         &ctx.accounts.token_vault_b,
    //         &ctx.accounts.token_program,
    //         delta_b,
    //     )?;
    // }

    Ok(())

    //
    // 2. Transfer back swapped (locked) tokens to the liquidator
    //

    // Liquidated position has value in three cases:
    // (1) All Token A (2) All Token B (3) Token A & Token B

    // if delta_a > 0 && delta_b == 0 {
    //     // Case 1 (if): Loan was swapped from A to B, so swap B to A and transfer to liquidator.
    //     // => Trade position is in total profit (e.g. price went up for long position)
    //     // Case 2 (else): Loan was swapped from B to A, so transfer A directly to liquidator.
    //     // => Trade position is in total loss (e.g. price went down for long position)
    //     let amount = if is_borrow_a {
    //         let token_vault_a_amount_before = ctx.accounts.token_vault_a.amount;
    //         let token_vault_b_amount_before = ctx.accounts.token_vault_b.amount;

    //         //
    //         // TODO: Validate that the receiver of the token swap is the globalpool's token vault
    //         //
    //         execute_jupiter_swap_for_globalpool(
    //             &ctx.accounts.globalpool,
    //             &ctx.remaining_accounts,
    //             &params.swap_instruction_data,
    //         )?;

    //         // Validate output more rigorously

    //         let token_vault_a_amount_after = ctx.accounts.token_vault_a.amount;
    //         let token_vault_b_amount_after = ctx.accounts.token_vault_b.amount;

    //         if token_vault_a_amount_after <= token_vault_a_amount_before {
    //             return Err(ErrorCode::InvalidLoanTradeSwapResult.into());
    //         }

    //         // Make sure only allowed amount of Token B was withdrawn
    //         if token_vault_b_amount_after >= token_vault_b_amount_before {
    //             return Err(ErrorCode::InvalidLoanTradeSwapResult.into());
    //         }
    //         if token_vault_b_amount_before - token_vault_b_amount_after
    //             > ctx.accounts.position.loan_token_swapped
    //         {
    //             return Err(ErrorCode::InvalidLoanTradeSwapResult.into());
    //         }

    //         token_vault_a_amount_after - token_vault_a_amount_before
    //     } else {
    //         ctx.accounts.position.total_borrowed_amount() + ctx.accounts.position.collateral_amount
    //     };

    //     transfer_from_vault_to_owner(
    //         &ctx.accounts.globalpool,
    //         &ctx.accounts.token_vault_a,
    //         &ctx.accounts.token_liquidator_account_a,
    //         &ctx.accounts.token_program,
    //         amount,
    //     )?;
    // } else if delta_a == 0 && delta_b > 0 {
    //     // Case 1 (if): Loan was swapped from A to B, so transfer B directly to liquidator.
    //     // => Trade position is in total profit (e.g. price went up for long position)
    //     // Case 2 (else): Loan was swapped from B to A, so swap A to B and transfer to liquidator.
    //     // => Trade position is in total loss (e.g. price went down for long position)
    //     let amount = if is_borrow_a {
    //         ctx.accounts.position.total_borrowed_amount() + ctx.accounts.position.collateral_amount
    //     } else {
    //         let token_vault_a_amount_before = ctx.accounts.token_vault_a.amount;
    //         let token_vault_b_amount_before = ctx.accounts.token_vault_b.amount;

    //         //
    //         // TODO: Validate that the receiver of the token swap is the globalpool's token vault
    //         //
    //         execute_jupiter_swap_for_globalpool(
    //             &ctx.accounts.globalpool,
    //             &ctx.remaining_accounts,
    //             &params.swap_instruction_data,
    //         )?;

    //         // Validate output more rigorously

    //         let token_vault_a_amount_after = ctx.accounts.token_vault_a.amount;
    //         let token_vault_b_amount_after = ctx.accounts.token_vault_b.amount;

    //         if token_vault_b_amount_after <= token_vault_b_amount_before {
    //             return Err(ErrorCode::InvalidLoanTradeSwapResult.into());
    //         }

    //         // Make sure only allowed amount of Token B was withdrawn
    //         if token_vault_a_amount_after >= token_vault_a_amount_before {
    //             return Err(ErrorCode::InvalidLoanTradeSwapResult.into());
    //         }
    //         if token_vault_a_amount_before - token_vault_a_amount_after
    //             > ctx.accounts.position.loan_token_swapped
    //         {
    //             return Err(ErrorCode::InvalidLoanTradeSwapResult.into());
    //         }

    //         token_vault_b_amount_after - token_vault_b_amount_before
    //     };

    //     transfer_from_vault_to_owner(
    //         &ctx.accounts.globalpool,
    //         &ctx.accounts.token_vault_b,
    //         &ctx.accounts.token_liquidator_account_b,
    //         &ctx.accounts.token_program,
    //         amount,
    //     )?;
    // } else {
    //     // Case 1 (if): Loan was swapped from A to B (collateral is in B), so transfer all
    //     //              outstanding B first, then swap B to A to transfer the remaining A.
    //     if is_borrow_a {

    //     }
    // }

    // //
    // // 3. Any leftover collateral returned to the owner and penalty fee credited to liquidator
    // //

    // Ok(())
}
