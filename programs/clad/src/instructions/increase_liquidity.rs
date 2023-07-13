use {
    crate::{
        errors::ErrorCode,
        manager::liquidity_manager::{
            calculate_liquidity_token_deltas, calculate_modify_liquidity,
            sync_modify_liquidity_values,
        },
        math::convert_to_liquidity_delta,
        state::*,
        util::{to_timestamp_u64, transfer_from_owner_to_vault, verify_position_authority},
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct ModifyLiquidity<'info> {
    pub position_authority: Signer<'info>,

    #[account(mut)]
    pub globalpool: Account<'info, Globalpool>,

    #[account(mut, has_one = globalpool)]
    pub position: Account<'info, LiquidityPosition>,

    #[account(
        constraint = position_token_account.mint == position.position_mint,
        constraint = position_token_account.amount == 1
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_a.mint == globalpool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_b.mint == globalpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_vault_a.key() == globalpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_vault_b.key() == globalpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_lower: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_upper: AccountLoader<'info, TickArray>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IncreaseLiquidityParams {
    pub liquidity_amount: u128,
    pub token_max_a: u64,
    pub token_max_b: u64,
}

pub fn increase_liquidity(
    ctx: Context<ModifyLiquidity>,
    params: &IncreaseLiquidityParams,
) -> Result<()> {
    verify_position_authority(
        &ctx.accounts.position_token_account,
        &ctx.accounts.position_authority,
    )?;

    if params.liquidity_amount == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }
    let liquidity_delta = convert_to_liquidity_delta(params.liquidity_amount, true)?;
    let timestamp = to_timestamp_u64(Clock::get()?.unix_timestamp)?;

    let update = calculate_modify_liquidity(
        &ctx.accounts.globalpool,
        &ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        liquidity_delta,
        timestamp,
    )?;

    msg!("Current Tick Index: {:?}", ctx.accounts.globalpool.tick_current_index);
    msg!("Position Tick Lower: {:?}", ctx.accounts.position.tick_lower_index);
    msg!("Position Tick Upper: {:?}", ctx.accounts.position.tick_upper_index);
    let tick_array_lower_start = ctx.accounts.tick_array_lower.load()?.start_tick_index;
    let tick_array_upper_start = ctx.accounts.tick_array_upper.load()?.start_tick_index;
    msg!("TickArray Lower Tick: {:?}", tick_array_lower_start);
    msg!("TickArray Upper Tick: {:?}", tick_array_upper_start);

    msg!("Msg:\n {:?}", update);

    sync_modify_liquidity_values(
        &mut ctx.accounts.globalpool,
        &mut ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        update,
    )?;

    let (delta_a, delta_b) = calculate_liquidity_token_deltas(
        ctx.accounts.globalpool.tick_current_index,
        ctx.accounts.globalpool.sqrt_price,
        &ctx.accounts.position,
        liquidity_delta,
    )?;

    msg!("Delta A: {:?}", delta_a);
    msg!("Delta B: {:?}", delta_b);

    if delta_a > params.token_max_a {
        return Err(ErrorCode::TokenMaxExceeded.into());
    } else if delta_b > params.token_max_b {
        return Err(ErrorCode::TokenMaxExceeded.into());
    }

    transfer_from_owner_to_vault(
        &ctx.accounts.position_authority,
        &ctx.accounts.token_owner_account_a,
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_program,
        delta_a,
    )?;

    transfer_from_owner_to_vault(
        &ctx.accounts.position_authority,
        &ctx.accounts.token_owner_account_b,
        &ctx.accounts.token_vault_b,
        &ctx.accounts.token_program,
        delta_b,
    )?;

    Ok(())
}
