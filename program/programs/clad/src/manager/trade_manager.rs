use {
    crate::{
        errors::ErrorCode, manager::tick_manager::next_tick_cross_update, math::*, state::*,
        util::SwapTickSequence,
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

pub fn borrow(
    globalpool: &Globalpool,
    swap_tick_sequence: &mut SwapTickSequence,
    amount: u64,
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
    let mut curr_tick_index = globalpool.tick_current_index;
    let mut curr_array_index: usize = 0;

    while amount_remaining > 0 {
        // TODO: check if `borrow_a` is directly translatable to `a_to_b`
        let (next_array_index, next_tick_index) = swap_tick_sequence
            .get_next_initialized_tick_index(curr_tick_index, tick_spacing, !borrow_a, curr_array_index);

        if (borrow_a && next_tick_index > curr_tick_index) || borrow_b && next_tick_index < curr_tick_index {
            return Err(ErrorCode::TickArraySequenceInvalidIndex.into());
        }

        let (next_tick, next_tick_initialized) = swap_tick_sequence
            .get_tick(next_array_index, next_tick_index, tick_spacing)
            .map_or_else(|_| (None, false), |tick| (Some(tick), tick.initialized));
    }
}