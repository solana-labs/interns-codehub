use {
    crate::{
        errors::ErrorCode,
        manager::{liquidity_manager, loan_manager},
        state::*,
        util::{
            burn_and_close_user_position_token, transfer_from_vault_to_owner,
            verify_position_authority,
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct CloseLoanPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>, // position_authority

    pub globalpool: Box<Account<'info, Globalpool>>,

    /// CHECK: safe, for receiving rent only
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,

    #[account(
        mut,
        close = receiver,
        seeds = [
            b"trade_position".as_ref(), 
            position_mint.key().as_ref()
        ],
        bump,
    )]
    pub position: Box<Account<'info, TradePosition>>,

    #[account(mut, address = position.position_mint)]
    pub position_mint: Account<'info, Mint>,

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
}

pub fn close_loan_position(ctx: Context<CloseLoanPosition>) -> Result<()> {
    verify_position_authority(&ctx.accounts.position_token_account, &ctx.accounts.owner)?;

    if !TradePosition::is_position_empty(&ctx.accounts.position) {
        return Err(ErrorCode::CloseTradePositionNotEmpty.into());
    }

    let liquidity_borrowed = ctx.accounts.position.liquidity_borrowed;
    let loan_token_available = ctx.accounts.position.loan_token_available;

    // Last param assumes that all loaned token was swapped to trade token in `open_trade_position`
    let update = loan_manager::calculate_modify_loan(
        &ctx.accounts.globalpool,
        &ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        -(liquidity_borrowed as i128),
        -(loan_token_available as i64),
    )?;

    liquidity_manager::sync_modify_liquidity_values_for_loan(
        &mut ctx.accounts.globalpool,
        &mut ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        update,
    )?;

    let is_borrow_a = ctx.accounts.position.is_borrow_a(&ctx.accounts.globalpool);

    let collateral_token_owner_account;
    let collateral_token_vault;

    // borrow a => collateral is b (vice versa)
    if is_borrow_a {
        collateral_token_owner_account = &ctx.accounts.token_owner_account_b;
        collateral_token_vault = &ctx.accounts.token_vault_b;
    } else {
        collateral_token_owner_account = &ctx.accounts.token_owner_account_a;
        collateral_token_vault = &ctx.accounts.token_vault_a;
    };

    let collateral_amount = ctx.accounts.position.collateral_amount;

    transfer_from_vault_to_owner(
        &ctx.accounts.globalpool,
        collateral_token_vault,
        collateral_token_owner_account,
        &ctx.accounts.token_program,
        collateral_amount,
    )?;

    //
    // Burn loan position token
    //

    burn_and_close_user_position_token(
        &ctx.accounts.owner,
        &ctx.accounts.receiver,
        &ctx.accounts.position_mint,
        &ctx.accounts.position_token_account,
        &ctx.accounts.token_program,
    )
}
