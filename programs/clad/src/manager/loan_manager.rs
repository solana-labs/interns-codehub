use {
    super::{
        globalpool_manager::next_globalpool_liquidity,
        tick_manager::next_tick_modify_liquidity_update_from_loan,
    },
    crate::{errors::ErrorCode, math::*, state::*},
    anchor_lang::prelude::{AccountLoader, *},
};

#[derive(Debug)]
pub struct ModifyLoanUpdate {
    pub globalpool_liquidity: u128,
    pub loan_interest_annual_bps: u16, // 2^16 = 65,536 bps = 655.36% annual, which should be enough
    pub tick_lower_update: TickUpdate,
    pub tick_upper_update: TickUpdate,
    pub position_update: TradePositionUpdate,
}

// Calculates state after modifying liquidity by the `borrowed_amount` for the given positon.
// Fee growths will also be calculated by this function.
// To trigger only calculation of fee growths, use calculate_fee_growths.
pub fn calculate_modify_loan<'info>(
    globalpool: &Globalpool,
    position: &TradePosition,
    tick_array_lower: &AccountLoader<'info, TickArray>,
    tick_array_upper: &AccountLoader<'info, TickArray>,
    liquidity_delta: i128,
    borrowed_amount: i64,
) -> Result<ModifyLoanUpdate> {
    // Disallow only updating position fee growth when position has zero liquidity
    if borrowed_amount == 0 {
        // && position.liquidity == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }

    let tick_array_lower = tick_array_lower.load()?;
    let tick_lower =
        tick_array_lower.get_tick(position.tick_lower_index, globalpool.tick_spacing)?;

    let tick_array_upper = tick_array_upper.load()?;
    let tick_upper =
        tick_array_upper.get_tick(position.tick_upper_index, globalpool.tick_spacing)?;

    let next_global_liquidity = next_globalpool_liquidity(
        globalpool,
        position.tick_upper_index,
        position.tick_lower_index,
        liquidity_delta,
    )?;

    //
    // Verify that enough liquidity exists in Ticks, if liquidity is to-be-borrowed (ie. positive)
    // Note: Must check both the lower & upper tick's `liquidity_gross`.
    //

    if liquidity_delta > 0 {
        let liquidity_delta_u128 = liquidity_delta.abs() as u128;
        if liquidity_delta_u128 > tick_lower.liquidity_gross
            && liquidity_delta_u128 > tick_upper.liquidity_gross
        {
            return Err(ErrorCode::InsufficientLiquidityToBorrow.into());
        }
    }

    //
    // Calculate Tick Updates (shouldn't have any fee updates since the ticks are out of range)
    //
    let tick_lower_update = next_tick_modify_liquidity_update_from_loan(
        tick_lower,
        position.tick_lower_index,
        globalpool.tick_current_index,
        globalpool.fee_growth_global_a,
        globalpool.fee_growth_global_b,
        liquidity_delta,
        false,
    )?;

    let tick_upper_update = next_tick_modify_liquidity_update_from_loan(
        tick_upper,
        position.tick_upper_index,
        globalpool.tick_current_index,
        globalpool.fee_growth_global_a,
        globalpool.fee_growth_global_b,
        liquidity_delta,
        true,
    )?;

    let loan_interest_annual_bps = _calculate_loan_interest_rate_annual(
        tick_lower_update.liquidity_gross,
        tick_upper_update.liquidity_gross,
        liquidity_delta as u128,
        liquidity_delta > 0, // ref `liquidity_manager.rs#L170`
    )?;

    //
    // Build TradePositionUpdate
    // Note: Add the absolute value of `liquidty_delta` as it's negative when borrowing (used to subtract liquidity from
    //       the pool) but the position itself needs to represent the borrowed liquidity that's now available (positive).
    //
    let loan_token_available = if borrowed_amount > 0 {
        position
            .loan_token_available
            .checked_add(borrowed_amount as u64)
            .unwrap()
    } else {
        position
            .loan_token_available
            .checked_sub(borrowed_amount.abs() as u64)
            .unwrap()
    };

    let position_update = TradePositionUpdate {
        loan_token_available,
        loan_token_swapped: position.loan_token_swapped,
        trade_token_amount: position.trade_token_amount,
    };

    Ok(ModifyLoanUpdate {
        globalpool_liquidity: next_global_liquidity,
        loan_interest_annual_bps,
        position_update,
        tick_lower_update,
        tick_upper_update,
    })
}

//
// Simple linear interest rate based on utilization of tick liquidity gross.
//
// TODO: More complex utilization-based interest rate model, like Aave's.
//
pub fn _calculate_loan_interest_rate_annual(
    tick_lower_liquidity_gross: u128,
    tick_upper_liquidity_gross: u128,
    liquidity_borrowed: u128,
    round_up: bool,
) -> Result<u16> {
    let min_bps = 100_u128; // min annual: 1% => 100bps

    let multiplier = U256Muldiv::new(0, 100_u128); // 1% => 100 bps
    let tick_lower_denom = U256Muldiv::new(0, tick_lower_liquidity_gross);
    let tick_upper_denom = U256Muldiv::new(0, tick_upper_liquidity_gross);

    let (quotient_l, remainder_l) = U256Muldiv::new(0, liquidity_borrowed)
        .mul(multiplier)
        .div(tick_lower_denom, round_up);

    let (quotient_u, remainder_u) = U256Muldiv::new(0, liquidity_borrowed)
        .mul(multiplier)
        .div(tick_upper_denom, round_up);

    let tick_lower_utilization = if round_up && !remainder_l.is_zero() {
        quotient_l.add(U256Muldiv::new(0, 1)).try_into_u128()?
    } else {
        quotient_l.try_into_u128()?
    };

    let tick_upper_utilization = if round_up && !remainder_u.is_zero() {
        quotient_u.add(U256Muldiv::new(0, 1)).try_into_u128()?
    } else {
        quotient_u.try_into_u128()?
    };

    // Max of min_bps, tick_lower_utilization, tick_upper_utilization
    let utilization = std::cmp::max(
        min_bps,
        std::cmp::max(tick_lower_utilization, tick_upper_utilization),
    );

    // Downcast u128 to u16 (2^16 = 65,536 bps = 655.36% annual, which should be enough for interest rate)
    let utilization = if utilization > std::u16::MAX as u128 {
        std::u16::MAX
    } else {
        utilization as u16
    };

    Ok(utilization)
}

pub fn calculate_loan_liquidity_token_delta(
    current_tick_index: i32,
    tick_lower_index: i32,
    tick_upper_index: i32,
    liquidity_delta: i128,
) -> Result<(u64, bool)> {
    if liquidity_delta == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }

    // For a pool A/B (e.g. SOL/USDC), if current tick is
    // - below the loan's lower tick:
    //      - loan is borrowing Token A (SOL) (gets swapped to USDC for short-A)
    //      - collateral is in Token B (USDC)
    // - above the loan's upper tick:
    //      - loan is borrowing Token B (USDC) (gets swapped to SOL for long-A)
    //      - collateral is in Token A (SOL)
    // - otherwise, invalid.
    let is_borrow_token_a = current_tick_index < tick_lower_index;

    let liquidity: u128 = liquidity_delta.abs() as u128;
    let round_up = liquidity_delta > 0;

    let lower_sqrt_price = sqrt_price_from_tick_index(tick_lower_index);
    let upper_sqrt_price = sqrt_price_from_tick_index(tick_upper_index);

    // Always only in one token
    let delta = if is_borrow_token_a {
        // P ≤ p_a (y = 0) => borrowing `delta` amount of Token A (X)
        // Δt_a = liquidity * [(sqrt_price_lower - sqrt_price_upper) / (sqrt_price_upper * sqrt_price_lower)]
        get_amount_delta_a(lower_sqrt_price, upper_sqrt_price, liquidity, round_up)?
    } else {
        // P ≥ p_b (x = 0) => borrowing `delta` amount of Token B (Y)
        // Δt_b = liquidity * (sqrt_price_upper - sqrt_price_lower)
        get_amount_delta_b(lower_sqrt_price, upper_sqrt_price, liquidity, round_up)?
    };

    Ok((delta, is_borrow_token_a))
}

pub fn calculate_collateral(
    liquidity_amount: u128,
    tick_lower_index: i32,
    tick_upper_index: i32,
    swapped_amount_out: u64, // swap out amount from Jupiter
    is_borrow_token_a: bool,
) -> Result<u64> {
    let sqrt_price_lower = sqrt_price_from_tick_index(tick_lower_index);
    let sqrt_price_upper = sqrt_price_from_tick_index(tick_upper_index);

    let worst_case_value = if is_borrow_token_a {
        // Collateral is in Token B, worst case is full payment in Token B (swap back from A + collateral)
        get_amount_delta_b(
            sqrt_price_lower,
            sqrt_price_upper,
            liquidity_amount,
            !is_borrow_token_a,
        )
    } else {
        // Collateral is in Token A, worst case is full payment in Token A (swap back from B + collateral)
        get_amount_delta_a(
            sqrt_price_lower,
            sqrt_price_upper,
            liquidity_amount,
            !is_borrow_token_a,
        )
    }?;

    let collateral_amount = worst_case_value.checked_sub(swapped_amount_out).unwrap();

    Ok(collateral_amount)
}
