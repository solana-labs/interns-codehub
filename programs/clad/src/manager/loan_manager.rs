use {
    super::{
        globalpool_manager::next_globalpool_liquidity,
        tick_manager::next_tick_modify_liquidity_update_from_loan,
    },
    crate::{errors::ErrorCode, math::*, state::*, util::TickSequence},
    anchor_lang::prelude::{AccountLoader, *},
    solana_program::clock::UnixTimestamp,
};

#[derive(Debug, Default)]
pub struct PostBorrowUpdate {
    pub amount_a: u64,
    pub amount_b: u64,
    pub next_liquidity: u128,
    pub next_tick_index: i32,
    pub next_sqrt_price: u128,
    pub next_fee_growth_global: u128,
    pub next_protocol_fee: u64,
}

#[derive(Debug)]
pub struct ModifyLoanUpdate {
    pub globalpool_liquidity: u128,
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
    borrowed_amount: u64,
    borrow_a: bool,
) -> Result<ModifyLoanUpdate> {
    // Disallow only updating position fee growth when position has zero liquidity
    if borrowed_amount == 0 {
        // && position.liquidity == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }

    let tick_lower_index = position.tick_lower_index;
    let tick_upper_index = position.tick_upper_index;

    let tick_array_lower = tick_array_lower.load()?;
    let tick_lower = tick_array_lower.get_tick(tick_lower_index, globalpool.tick_spacing)?;

    let tick_array_upper = tick_array_upper.load()?;
    let tick_upper = tick_array_upper.get_tick(tick_upper_index, globalpool.tick_spacing)?;

    let next_global_liquidity = next_globalpool_liquidity(
        globalpool,
        tick_upper_index,
        tick_lower_index,
        liquidity_delta,
    )?;

    //
    // Verify that enough liquidity exists in Ticks.
    // Note: Must check both the lower & upper tick's `liquidity_gross`.
    //
    let liquidity_delta_u128 = liquidity_delta.abs() as u128;
    if liquidity_delta_u128 > tick_lower.liquidity_gross
        && liquidity_delta_u128 > tick_upper.liquidity_gross
    {
        return Err(ErrorCode::InsufficientLiquidityToBorrow.into());
    }

    //
    // Calculate Tick Updates (shouldn't have any fee updates since the ticks are out of range)
    //
    let tick_lower_update = next_tick_modify_liquidity_update_from_loan(
        tick_lower,
        tick_lower_index,
        globalpool.tick_current_index,
        globalpool.fee_growth_global_a,
        globalpool.fee_growth_global_b,
        liquidity_delta,
        false,
        borrow_a,
    )?;

    let tick_upper_update = next_tick_modify_liquidity_update_from_loan(
        tick_upper,
        tick_upper_index,
        globalpool.tick_current_index,
        globalpool.fee_growth_global_a,
        globalpool.fee_growth_global_b,
        liquidity_delta,
        true,
        borrow_a,
    )?;

    //
    // Build TradePositionUpdate
    // Note: Add the absolute value of `liquidty_delta` as it's negative when borrowing (used to subtract liquidity from
    //       the pool) but the position itself needs to represent the borrowed liquidity that's now available (positive).
    //
    let liquidity_available = position.liquidity_available.checked_add(borrowed_amount).unwrap();
    let position_update = TradePositionUpdate {
        liquidity_available,
        liquidity_swapped: position.liquidity_swapped,
    };
    msg!("position_update: {:?}", position_update);
    msg!("tick_lower_update: {:?}", tick_lower_update);
    msg!("tick_upper_update: {:?}", tick_upper_update);

    Ok(ModifyLoanUpdate {
        globalpool_liquidity: next_global_liquidity,
        position_update,
        tick_lower_update,
        tick_upper_update,
    })
}

pub fn calculate_loan_liquidity_token_delta(
    current_tick_index: i32,
    tick_lower_index: i32,
    tick_upper_index: i32,
    liquidity_delta: i128,
) -> Result<(u64, bool, bool, u128, u128)> {
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
    // msg!("lower_price_sqrt: {:?}", lower_sqrt_price);
    // msg!("upper_price_sqrt: {:?}", upper_sqrt_price);

    // Always only in one token
    let delta = if is_borrow_token_a {
        // P ≤ p_a (y = 0)
        // Δt_a = liquidity * [(sqrt_price_lower - sqrt_price_upper) / (sqrt_price_upper * sqrt_price_lower)]
        get_amount_delta_a(lower_sqrt_price, upper_sqrt_price, liquidity, round_up)?
    } else {
        // P ≥ p_b (x = 0)
        // Δt_b = liquidity * (sqrt_price_upper - sqrt_price_lower)
        get_amount_delta_b(lower_sqrt_price, upper_sqrt_price, liquidity, round_up)?
    };

    Ok((
        delta,
        is_borrow_token_a,
        !is_borrow_token_a, // is_collateral_token_a
        lower_sqrt_price,
        upper_sqrt_price,
    ))
}

pub fn calculate_collateral(
    token_borrow_amount: u64,
    is_borrow_token_a: bool,
    token_price_feed_a: &Account<'_, PriceFeed>,
    token_price_feed_b: &Account<'_, PriceFeed>,
    current_timestamp: UnixTimestamp,
) -> Result<u64> {
    let token_oracle_a = token_price_feed_a.read_price(current_timestamp)?;
    let token_oracle_b = token_price_feed_b.read_price(current_timestamp)?;

    // Prices scaled to exponent (e.g. 10^9 for SOL, 10^6 for USDC)
    let token_price_a = token_oracle_a.price_with_expo;
    let token_price_b = token_oracle_b.price_with_expo;

    // token_price_a_b = A/B (Token A quoted in Token B, e.g. SOL/USDC)
    let token_price_a_b = token_price_feed_a
        .read_price_in_quote(token_price_feed_b, current_timestamp)?
        .price_with_expo;
    let token_price_b_a = token_price_feed_b
        .read_price_in_quote(token_price_feed_a, current_timestamp)?
        .price_with_expo;

    let borrowed_value_in_collateral_token = token_borrow_amount
        .checked_mul(if is_borrow_token_a {
            token_price_b_a
        } else {
            token_price_a_b
        })
        .unwrap();

    //
    // Collateral amount is a function of:
    // 1. Loan size;
    // 2. Distance from lower/upper tick of the loan to the current tick of the pool;
    // 3. Distance between lower and upper tick of the loan.
    // 4. Current price of the two tokens in the pool (collateral token & loaned token).
    //

    // For now, just 33% regardless of (2) and (3)
    let collateral_amount = borrowed_value_in_collateral_token
        .checked_div(3)
        .unwrap();

    //
    // WARNING: This is a temporary solution for strict testing purposes, and should not be used for production.
    //

    // let num_2_pow_neg_64 = 1_f32 / 18446744073709551616_f32;
    // let lower_price = (lower_sqrt_price as f32 * num_2_pow_neg_64).powf(2_f32);
    // let upper_price = (upper_sqrt_price as f32 * num_2_pow_neg_64).powf(2_f32);

    // let (lower_price, upper_price) = if collateral_token_mint_decimals
    //     > borrowed_token_mint_decimals
    // {
    //     let decimals_expo =
    //         10_f32.powf((collateral_token_mint_decimals - borrowed_token_mint_decimals) as f32);
    //     (lower_price * decimals_expo, upper_price * decimals_expo)
    // } else if collateral_token_mint_decimals < borrowed_token_mint_decimals {
    //     let decimals_expo = lower_price
    //         / 10_f32.powf((borrowed_token_mint_decimals - collateral_token_mint_decimals) as f32);
    //     (lower_price * decimals_expo, upper_price * decimals_expo)
    // } else {
    //     (lower_price, upper_price)
    // };

    Ok(collateral_amount)
}

/*
pub fn calculate_borrowed_ticks(
    globalpool: &Globalpool,
    loan_tick_sequence: &mut TickSequence,
    amount: u64,
    start_tick_index: i32,
    borrow_a: bool, // true = borrow Token A, false = borrow Token B
) -> Result<Vec<TickLoan>> {
    if amount == 0 {
        return Err(ErrorCode::ZeroBorrowableAmount.into());
    }

    let tick_spacing = globalpool.tick_spacing;

    // Borrow A traverses right Ticks, Borrow B traverses left Ticks
    // Swapping A to B deposits A and withdraws B. Borrowing B is withdrawing B.
    let a_to_b = !borrow_a;

    let mut amount_remaining = amount;
    let mut amount_calculated = 0;
    let mut curr_tick_index = start_tick_index;
    let mut curr_array_index: usize = 0;

    while amount_remaining > 0 {
        let (next_array_index, next_tick_index) = loan_tick_sequence
            .get_next_initialized_tick_index(
                curr_tick_index,
                tick_spacing,
                a_to_b,
                curr_array_index,
            );

        // Borrow A must search liquidity by decreasing tick index (traverse left).
        // Borrow B must search liquidity by increasing tick index (traverse right).
        // if (borrow_a && next_tick_index > curr_tick_index)
        //     || (!borrow_a && next_tick_index < curr_tick_index)
        // {
        //     return Err(ErrorCode::TickArraySequenceInvalidIndex.into());
        // }

        // TODO: We skip over the first `curr_tick_index` because we fetch `next_tick` using the first
        //       `curr_tick_index`. Fix to include the first tick as well in liquidity calculation.

        let (next_tick, next_tick_initialized) = loan_tick_sequence
            .get_tick(next_array_index, next_tick_index, tick_spacing)
            .map_or_else(|_| (None, false), |tick| (Some(tick), tick.initialized));

        // Calculate liquidity withdrawals if (next) tick is initialized.
        if next_tick_initialized {
            let next_tick = next_tick.unwrap();

            // TODO: Does manipulating liquidity (with no fee charged) affect the future calculations of
            //       fee calculation for swaps?
            let tick_liquidity = next_tick.liquidity_gross;
            let tick_loan = TickLoan {
                tick: curr_tick_index,
                liquidity: tick_liquidity,
            };

            let (update, next_liquidity) = calculate_update(
                &next_tick.unwrap(),
                a_to_b,
                curr_liquidity,
                fee_growth_global_a,
                fee_growth_global_b,
            )?;

            curr_liquidity = next_liquidity;
            swap_tick_sequence.update_tick(
                next_array_index,
                next_tick_index,
                tick_spacing,
                &update,
            )?;
        }

        let tick_offset =
            loan_tick_sequence.get_tick_offset(next_array_index, next_tick_index, tick_spacing)?;

        // Increment to the next tick array if either condition is true:
        //  - Search is moving left (borrow A) and the current tick is the start of the current tick array
        //  - Search is moving right (borrow B) and the current tick is the end of the current tick array
        curr_array_index = if (a_to_b && tick_offset == 0)
            || (!a_to_b && tick_offset == TICK_ARRAY_SIZE as isize - 1)
        {
            next_array_index + 1
        } else {
            next_array_index
        };

        // The get_init_tick search is inclusive of the current index in an a_to_b trade.
        // We therefore have to shift the index by 1 to advance to the next init tick to the left.
        curr_tick_index = if a_to_b {
            next_tick_index - 1
        } else {
            next_tick_index
        };
    }
}
 */

pub fn borrow(
    globalpool: &Globalpool,
    loan_tick_sequence: &mut TickSequence,
    amount: u64,
    start_tick_index: i32,
    borrow_a: bool, // true = borrow Token A, false = borrow Token B
) -> Result<PostBorrowUpdate> {
    if amount == 0 {
        return Err(ErrorCode::ZeroBorrowableAmount.into());
    }

    let tick_spacing = globalpool.tick_spacing;
    let borrow_b = !borrow_a;

    let mut amount_remaining = amount;
    let mut amount_calculated = 0;
    let mut curr_liquidity = globalpool.liquidity_available;
    let mut curr_tick_index = start_tick_index;
    let mut curr_array_index: usize = 0;

    while amount_remaining > 0 {
        // TODO: check if `borrow_a` is directly translatable to `a_to_b`
        let (next_array_index, next_tick_index) = loan_tick_sequence
            .get_next_initialized_tick_index(
                curr_tick_index,
                tick_spacing,
                !borrow_a,
                curr_array_index,
            )?;

        if (borrow_a && next_tick_index > curr_tick_index)
            || borrow_b && next_tick_index < curr_tick_index
        {
            return Err(ErrorCode::TickArraySequenceInvalidIndex.into());
        }

        let (next_tick, next_tick_initialized) = loan_tick_sequence
            .get_tick(next_array_index, next_tick_index, tick_spacing)
            .map_or_else(|_| (None, false), |tick| (Some(tick), tick.initialized));
    }

    Ok(PostBorrowUpdate::default())
}
