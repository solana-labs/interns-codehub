use crate::errors::ErrorCode;
use crate::math::{add_liquidity_delta, checked_mul_div};
use crate::state::*;

// Calculates the next global liquidity for a globalpool depending on its position relative
// to the lower and upper tick indexes and the liquidity_delta.
pub fn next_globalpool_liquidity(
    globalpool: &Globalpool,
    tick_upper_index: i32,
    tick_lower_index: i32,
    liquidity_delta: i128,
) -> Result<u128, ErrorCode> {
    if globalpool.tick_current_index < tick_upper_index
        && globalpool.tick_current_index >= tick_lower_index
    {
        add_liquidity_delta(globalpool.liquidity, liquidity_delta)
    } else {
        Ok(globalpool.liquidity)
    }
}
