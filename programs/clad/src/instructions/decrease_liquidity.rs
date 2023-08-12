use {
    super::ModifyLiquidity,
    crate::{
        errors::ErrorCode,
        manager::liquidity_manager::{
            calculate_liquidity_token_deltas, calculate_modify_liquidity,
            sync_modify_liquidity_values,
        },
        math::convert_to_liquidity_delta,
        util::{to_timestamp_u64, transfer_from_vault_to_owner, verify_position_authority},
    },
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DecreaseLiquidityParams {
    liquidity_amount: u128,
    token_min_a: u64,
    token_min_b: u64,
}

/*
  Removes liquidity from an existing Globalpool Position.
*/
pub fn decrease_liquidity(
    ctx: Context<ModifyLiquidity>,
    params: &DecreaseLiquidityParams,
) -> Result<()> {
    verify_position_authority(
        &ctx.accounts.position_token_account,
        &ctx.accounts.position_authority,
    )?;

    let clock = Clock::get()?;

    if params.liquidity_amount == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }
    let liquidity_delta = convert_to_liquidity_delta(params.liquidity_amount, false)?;
    let timestamp = to_timestamp_u64(clock.unix_timestamp)?;

    let update = calculate_modify_liquidity(
        &ctx.accounts.globalpool,
        &ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        liquidity_delta,
        timestamp,
    )?;

    sync_modify_liquidity_values(
        &mut ctx.accounts.globalpool,
        &mut ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        update,
    )?;

    let (delta_a, delta_b) = calculate_liquidity_token_deltas(
        ctx.accounts.position.tick_lower_index,
        ctx.accounts.position.tick_upper_index,
        ctx.accounts.globalpool.tick_current_index,
        ctx.accounts.globalpool.sqrt_price,
        liquidity_delta,
    )?;

    if delta_a < params.token_min_a {
        return Err(ErrorCode::TokenMinSubceeded.into());
    } else if delta_b < params.token_min_b {
        return Err(ErrorCode::TokenMinSubceeded.into());
    }

    transfer_from_vault_to_owner(
        &ctx.accounts.globalpool,
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_owner_account_a,
        &ctx.accounts.token_program,
        delta_a,
    )?;

    transfer_from_vault_to_owner(
        &ctx.accounts.globalpool,
        &ctx.accounts.token_vault_b,
        &ctx.accounts.token_owner_account_b,
        &ctx.accounts.token_program,
        delta_b,
    )?;

    Ok(())
}
