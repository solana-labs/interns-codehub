use {
    crate::{
        errors::ErrorCode,
        manager::{liquidity_manager, loan_manager},
        math::*,
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
    pub position_authority: AccountInfo<'info>,

    pub globalpool: Box<Account<'info, Globalpool>>,

    #[account(
        seeds = [
            b"trade_position".as_ref(),
            position_mint.key().as_ref()
        ],
        bump,
    )]
    pub position: Box<Account<'info, TradePosition>>,

    #[account(
        mint::authority = globalpool,
        mint::decimals = 0,
    )]
    pub position_mint: Account<'info, Mint>,

    #[account(
        associated_token::mint = position_mint,
        associated_token::authority = position_authority,
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = token_pos_auth_account_a.mint == globalpool.token_mint_a,
        constraint = token_pos_auth_account_a.owner == *position_authority.key,
    )]
    pub token_pos_auth_account_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = token_liquidator_account_a.mint == globalpool.token_mint_a,
        constraint = token_liquidator_account_a.owner == *liquidator.key,
    )]
    pub token_liquidator_account_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(address = globalpool.token_mint_a)]
    pub token_mint_a: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = token_pos_auth_account_b.mint == globalpool.token_mint_b,
        constraint = token_pos_auth_account_b.owner == *position_authority.key,
    )]
    pub token_pos_auth_account_b: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = token_liquidator_account_b.mint == globalpool.token_mint_b,
        constraint = token_liquidator_account_b.owner == *liquidator.key,
    )]
    pub token_liquidator_account_b: Box<Account<'info, TokenAccount>>,

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
    // For pyth
    // pub clock: Sysvar<'info, Clock>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct LiquidateTradePositionParams {
    pub tick_lower_index: i32,
    pub tick_upper_index: i32,
}

pub fn liquidate_trade_position(
    ctx: Context<LiquidateTradePosition>,
    params: &LiquidateTradePositionParams,
) -> Result<()> {
    if !(ctx.accounts.position.has_matured()?) {
        return Err(ErrorCode::LoanNotMatured.into());
    }

    //
    // The flow is similar to `repay_trade_position`, excep that, instead of Jupiter to swap within
    // the program, the liquidator acts as a middleman to swap the tokens. In exchange, the liquidator
    // gets the penalty fee (which was added as a buffer at the start of the loan).
    //

    //
    // 1. Transfer tokens from the liquidator directly to the token vaults
    //

    //
    // 2. Transfer back swapped tokens to the liquidator
    //

    //
    // 3. Any leftover collateral returned to the owner and penalty fee credited to liquidator
    //

    //
    // 4. Burn the position token
    //

    Ok(())
}
