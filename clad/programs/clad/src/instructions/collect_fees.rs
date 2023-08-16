use {
    crate::{
        manager::liquidity_manager::calculate_fee_growths,
        state::*,
        util::{to_timestamp_u64, transfer_from_vault_to_owner, verify_position_authority},
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct CollectFees<'info> {
    pub globalpool: Box<Account<'info, Globalpool>>,

    pub position_authority: Signer<'info>,

    #[account(mut, has_one = globalpool)]
    pub position: Box<Account<'info, LiquidityPosition>>,
    #[account(
        constraint = position_token_account.mint == position.position_mint,
        constraint = position_token_account.amount == 1
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    #[account(has_one = globalpool)]
    pub tick_array_lower: AccountLoader<'info, TickArray>,
    #[account(has_one = globalpool)]
    pub tick_array_upper: AccountLoader<'info, TickArray>,

    #[account(mut, constraint = token_owner_account_a.mint == globalpool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = globalpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_b.mint == globalpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = globalpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
}

pub fn collect_fees(ctx: Context<CollectFees>) -> Result<()> {
    verify_position_authority(
        &ctx.accounts.position_token_account,
        &ctx.accounts.position_authority,
    )?;

    let globalpool = &mut ctx.accounts.globalpool;
    // let position = &mut ctx.accounts.position;

    // Update fee accrued for the position
    let position_update = &calculate_fee_growths(
        globalpool,
        &ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        to_timestamp_u64(Clock::get()?.unix_timestamp)?,
    )?;
    (&mut ctx.accounts.position).update(position_update);

    // Store the fees owed to use as transfer amounts, before resetting.
    let fee_owed_a = ctx.accounts.position.fee_owed_a;
    let fee_owed_b = ctx.accounts.position.fee_owed_b;

    // Reset the fee before transfer.
    (&mut ctx.accounts.position).reset_fees_owed();

    transfer_from_vault_to_owner(
        globalpool,
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_owner_account_a,
        &ctx.accounts.token_program,
        fee_owed_a,
    )?;

    transfer_from_vault_to_owner(
        globalpool,
        &ctx.accounts.token_vault_b,
        &ctx.accounts.token_owner_account_b,
        &ctx.accounts.token_program,
        fee_owed_b,
    )?;

    Ok(())
}
