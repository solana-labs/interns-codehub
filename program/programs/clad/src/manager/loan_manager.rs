use {
    crate::{
        errors::ErrorCode, manager::tick_manager::next_tick_cross_update, math::*, state::*,
        util::TickSequence,
    },
    anchor_lang::prelude::*,
    std::convert::TryInto,
};

#[derive(Debug)]
pub struct PostBorrowUpdate {
    pub amount_a: u64,
    pub amount_b: u64,
    pub next_liquidity: u128,
    pub next_tick_index: i32,
    pub next_sqrt_price: u128,
    pub next_fee_growth_global: u128,
    pub next_protocol_fee: u64,
}

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
        if (borrow_a && next_tick_index > curr_tick_index)
            || (!borrow_a && next_tick_index < curr_tick_index)
        {
            return Err(ErrorCode::TickArraySequenceInvalidIndex.into());
        }

        let (next_tick, next_tick_initialized) = loan_tick_sequence
            .get_tick(next_array_index, next_tick_index, tick_spacing)
            .map_or_else(|_| (None, false), |tick| (Some(tick), tick.initialized));
        
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
            );

        if (borrow_a && next_tick_index > curr_tick_index)
            || borrow_b && next_tick_index < curr_tick_index
        {
            return Err(ErrorCode::TickArraySequenceInvalidIndex.into());
        }

        let (next_tick, next_tick_initialized) = loan_tick_sequence
            .get_tick(next_array_index, next_tick_index, tick_spacing)
            .map_or_else(|_| (None, false), |tick| (Some(tick), tick.initialized));
    }
}
