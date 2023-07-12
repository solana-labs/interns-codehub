use {
    super::{
        position_manager::next_position_modify_liquidity_update,
        tick_manager::{next_fee_growths_inside, next_tick_modify_liquidity_update},
        globalpool_manager::next_globalpool_liquidity,
    },
    crate::{
        errors::ErrorCode, manager::tick_manager::next_tick_cross_update, math::*, state::*,
        util::TickSequence,
    },
    anchor_lang::prelude::{AccountLoader, *},
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

// Calculates state after modifying liquidity by the liquidity_delta for the given positon.
// Fee growths will also be calculated by this function.
// To trigger only calculation of fee growths, use calculate_fee_growths.
pub fn calculate_modify_loan<'info>(
    globalpool: &Globalpool,
    position: &TradePosition,
    tick_array_lower: &AccountLoader<'info, TickArray>,
    tick_array_upper: &AccountLoader<'info, TickArray>,
    liquidity_delta: i128,
    timestamp: u64,
) -> Result<ModifyLoanUpdate> {
    // Disallow only updating position fee growth when position has zero liquidity
    if liquidity_delta == 0 { // && position.liquidity == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }

    let tick_lower_index = position.tick_lower_index;
    let tick_upper_index = position.tick_upper_index;

    let tick_array_lower = tick_array_lower.load()?;
    let tick_lower =
        tick_array_lower.get_tick(tick_lower_index, globalpool.tick_spacing)?;

    let tick_array_upper = tick_array_upper.load()?;
    let tick_upper =
        tick_array_upper.get_tick(tick_upper_index, globalpool.tick_spacing)?;

    let next_global_liquidity = next_globalpool_liquidity(
        globalpool,
        tick_upper_index,
        tick_lower_index,
        liquidity_delta,
    )?;

    //
    // Calculate Tick Updates (shouldn't have any fee updates since the ticks are out of range)
    //
    let tick_lower_update = next_tick_modify_liquidity_update(
        tick_lower,
        tick_lower_index,
        globalpool.tick_current_index,
        globalpool.fee_growth_global_a,
        globalpool.fee_growth_global_b,
        liquidity_delta,
        false,
    )?;

    let tick_upper_update = next_tick_modify_liquidity_update(
        tick_upper,
        tick_upper_index,
        globalpool.tick_current_index,
        globalpool.fee_growth_global_a,
        globalpool.fee_growth_global_b,
        liquidity_delta,
        true,
    )?;

    let (fee_growth_inside_a, fee_growth_inside_b) = next_fee_growths_inside(
        globalpool.tick_current_index,
        tick_lower,
        tick_lower_index,
        tick_upper,
        tick_upper_index,
        globalpool.fee_growth_global_a,
        globalpool.fee_growth_global_b,
    );

    //
    // Build TradePositionUpdate
    //
    let position_update = TradePositionUpdate {
        liquidity_available: add_liquidity_delta(position.liquidity_available, liquidity_delta)?,
        liquidity_swapped: position.liquidity_swapped,
    };

    Ok(ModifyLoanUpdate {
        globalpool_liquidity: next_global_liquidity,
        position_update,
        tick_lower_update,
        tick_upper_update,
    })
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
