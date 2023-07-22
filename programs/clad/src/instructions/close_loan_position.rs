use crate::util::verify_position_authority;

use {
    crate::{
        errors::ErrorCode,
        manager::{liquidity_manager, loan_manager},
        math::*,
        state::*,
        util::{mint_position_token_and_remove_authority, transfer_from_owner_to_vault},
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
};

#[derive(Accounts)]
pub struct CloseLoanPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

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
        // close,
        associated_token::mint = position_mint,
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

pub fn close_loan_position(
    ctx: Context<CloseLoanPosition>,
) -> Result<()> {
    verify_position_authority(&ctx.accounts.position_token_account, &ctx.accounts.owner)?;

    if ctx.accounts.position.liquidity_swapped != 0 {
        return Err(ErrorCode::LiquidityBorrowedNotEmpty.into());
    }

    // Add numbers back to `liquidity_available` of each borrowed ticks
    // Decrease numbers from `liquidity_borrowed_a` and `liquidity_borrowed_b`


    // liquidity_manager::sync_modify_liquidity_values_for_loan(
    //     &mut ctx.accounts.globalpool,
    //     position,
    //     &ctx.accounts.tick_array_lower,
    //     &ctx.accounts.tick_array_upper,
    //     update,
    // )?;

    Ok(())
}
