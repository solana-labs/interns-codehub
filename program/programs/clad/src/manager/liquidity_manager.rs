use super::{
    position_manager::next_position_modify_liquidity_update,
    tick_manager::{
        next_fee_growths_inside, next_tick_modify_liquidity_update,
    },
    globalpool_manager::{next_globalpool_liquidity},
};
use crate::{
    errors::ErrorCode,
    math::{get_amount_delta_a, get_amount_delta_b, sqrt_price_from_tick_index},
    state::*,
};
use anchor_lang::prelude::{AccountLoader, *};

#[derive(Debug)]
pub struct ModifyLiquidityUpdate {
    pub globalpool_liquidity: u128,
    pub tick_lower_update: TickUpdate,
    pub tick_upper_update: TickUpdate,
    pub position_update: PositionUpdate,
}

// Calculates state after modifying liquidity by the liquidity_delta for the given positon.
// Fee growths will also be calculated by this function.
// To trigger only calculation of fee growths, use calculate_fee_growths.
pub fn calculate_modify_liquidity<'info>(
    globalpool: &Globalpool,
    position: &LiquidityPosition,
    tick_array_lower: &AccountLoader<'info, TickArray>,
    tick_array_upper: &AccountLoader<'info, TickArray>,
    liquidity_delta: i128,
    timestamp: u64,
) -> Result<ModifyLiquidityUpdate> {
    let tick_array_lower = tick_array_lower.load()?;
    let tick_lower =
        tick_array_lower.get_tick(position.tick_lower_index, globalpool.tick_spacing)?;

    let tick_array_upper = tick_array_upper.load()?;
    let tick_upper =
        tick_array_upper.get_tick(position.tick_upper_index, globalpool.tick_spacing)?;

    Ok(_calculate_modify_liquidity(
        globalpool,
        position,
        tick_lower,
        tick_upper,
        position.tick_lower_index,
        position.tick_upper_index,
        liquidity_delta,
        timestamp,
    )?)
}

pub fn calculate_fee_growths<'info>(
    globalpool: &Globalpool,
    position: &LiquidityPosition,
    tick_array_lower: &AccountLoader<'info, TickArray>,
    tick_array_upper: &AccountLoader<'info, TickArray>,
    timestamp: u64,
) -> Result<PositionUpdate> {
    let tick_array_lower = tick_array_lower.load()?;
    let tick_lower =
        tick_array_lower.get_tick(position.tick_lower_index, globalpool.tick_spacing)?;

    let tick_array_upper = tick_array_upper.load()?;
    let tick_upper =
        tick_array_upper.get_tick(position.tick_upper_index, globalpool.tick_spacing)?;

    // Pass in a liquidity_delta value of 0 to trigger only calculations for fee growths.
    // Calculating fees for positions with zero liquidity will result in an error.
    let update = _calculate_modify_liquidity(
        globalpool,
        position,
        tick_lower,
        tick_upper,
        position.tick_lower_index,
        position.tick_upper_index,
        0,
        timestamp,
    )?;
    Ok(update.position_update)
}

// Calculates the state changes after modifying liquidity of a globalpool position.
fn _calculate_modify_liquidity(
    globalpool: &Globalpool,
    position: &LiquidityPosition,
    tick_lower: &Tick,
    tick_upper: &Tick,
    tick_lower_index: i32,
    tick_upper_index: i32,
    liquidity_delta: i128,
    timestamp: u64,
) -> Result<ModifyLiquidityUpdate> {
    // Disallow only updating position fee growth when position has zero liquidity
    if liquidity_delta == 0 && position.liquidity == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }

    let next_global_liquidity = next_globalpool_liquidity(
        globalpool,
        position.tick_upper_index,
        position.tick_lower_index,
        liquidity_delta,
    )?;

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

    let position_update = next_position_modify_liquidity_update(
        position,
        liquidity_delta,
        fee_growth_inside_a,
        fee_growth_inside_b,
    )?;

    Ok(ModifyLiquidityUpdate {
        globalpool_liquidity: next_global_liquidity,
        position_update,
        tick_lower_update,
        tick_upper_update,
    })
}

pub fn calculate_liquidity_token_deltas(
    current_tick_index: i32,
    sqrt_price: u128,
    position: &LiquidityPosition,
    liquidity_delta: i128,
) -> Result<(u64, u64)> {
    if liquidity_delta == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }

    let mut delta_a: u64 = 0;
    let mut delta_b: u64 = 0;

    let liquidity: u128 = liquidity_delta.abs() as u128;
    let round_up = liquidity_delta > 0;

    let lower_price = sqrt_price_from_tick_index(position.tick_lower_index);
    let upper_price = sqrt_price_from_tick_index(position.tick_upper_index);

    if current_tick_index < position.tick_lower_index {
        // current tick below position
        delta_a = get_amount_delta_a(lower_price, upper_price, liquidity, round_up)?;
    } else if current_tick_index < position.tick_upper_index {
        // current tick inside position
        delta_a = get_amount_delta_a(sqrt_price, upper_price, liquidity, round_up)?;
        delta_b = get_amount_delta_b(lower_price, sqrt_price, liquidity, round_up)?;
    } else {
        // current tick above position
        delta_b = get_amount_delta_b(lower_price, upper_price, liquidity, round_up)?;
    }

    Ok((delta_a, delta_b))
}

pub fn sync_modify_liquidity_values<'info>(
    globalpool: &mut Globalpool,
    position: &mut LiquidityPosition,
    tick_array_lower: &AccountLoader<'info, TickArray>,
    tick_array_upper: &AccountLoader<'info, TickArray>,
    modify_liquidity_update: ModifyLiquidityUpdate,
) -> Result<()> {
    position.update(&modify_liquidity_update.position_update);

    tick_array_lower.load_mut()?.update_tick(
        position.tick_lower_index,
        globalpool.tick_spacing,
        &modify_liquidity_update.tick_lower_update,
    )?;

    tick_array_upper.load_mut()?.update_tick(
        position.tick_upper_index,
        globalpool.tick_spacing,
        &modify_liquidity_update.tick_upper_update,
    )?;

    Ok(())
}

#[cfg(test)]
mod calculate_modify_liquidity_unit_tests {
    // Test position start => end state transitions after applying possible liquidity_delta values.
    // x => position has no liquidity
    // o => position has non-zero liquidity
    // x => tick is not initialized
    // o => tick is initialized
    // ox_position indicates position with liquidity has zero liquidity after modifying liquidity
    // xo_lower indicates lower tick was initialized after modifying liquidity

    // LiquidityPosition with zero liquidity remains in zero liquidity state
    // Only possible with negative and zero liquidity delta values which all result in errors
    // Current tick index location relative to position does not matter
    mod xx_position {
        use crate::{manager::liquidity_manager::_calculate_modify_liquidity, util::*};

        // Zero liquidity delta on position with zero liquidity is not allowed
        #[test]
        #[should_panic(expected = "LiquidityZero")]
        fn zero_delta_on_empty_position_not_allowed() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Below,
                globalpool_liquidity: 100,
                position_liquidity: 0,
                tick_lower_liquidity_gross: 0,
                tick_upper_liquidity_gross: 0,
                fee_growth_global_a: 0,
                fee_growth_global_b: 0,
            });
            _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                0,
                100,
            )
            .unwrap();
        }

        // Removing liquidity from position with zero liquidity results in error
        // LiquidityUnderflow from lower tick (xx_oo)
        #[test]
        #[should_panic(expected = "LiquidityUnderflow")]
        fn neg_delta_lower_tick_liquidity_underflow() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Below,
                globalpool_liquidity: 100,
                position_liquidity: 0,
                tick_lower_liquidity_gross: 0,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: 0,
                fee_growth_global_b: 0,
            });
            _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                -10,
                100,
            )
            .unwrap();
        }

        // Removing liquidity from position with zero liquidity results in error
        // LiquidityUnderflow from upper tick (oo_xx)
        #[test]
        #[should_panic(expected = "LiquidityUnderflow")]
        fn neg_delta_upper_tick_liquidity_underflow() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Below,
                globalpool_liquidity: 100,
                position_liquidity: 0,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 0,
                fee_growth_global_a: 0,
                fee_growth_global_b: 0,
            });
            _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                -10,
                100,
            )
            .unwrap();
        }

        // Removing liquidity from position with zero liquidity results in error
        // LiquidityUnderflow from updating position (oo_oo - not ticks)
        #[test]
        #[should_panic(expected = "LiquidityUnderflow")]
        fn neg_delta_position_liquidity_underflow() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Below,
                globalpool_liquidity: 100,
                position_liquidity: 0,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: 0,
                fee_growth_global_b: 0,
            });
            _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                -10,
                100,
            )
            .unwrap();
        }
    }

    // LiquidityPosition with zero liquidity transitions to positive liquidity
    // Only possible with positive liquidity delta values
    mod xo_position {

        // Current tick below position
        // Globalpool virtual liquidity does not change
        mod current_tick_below {
            use crate::{
                manager::liquidity_manager::_calculate_modify_liquidity, state::*, util::*,
            };

            // LiquidityPosition liquidity increase, checkpoint zero values
            // Lower tick initialized, liquidity increase, checkpoint zero values
            // Upper tick initialized, liquidity increase, checkpoint zero values
            #[test]
            fn pos_delta_current_tick_below_xo_lower_xo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: -10,
                            ..Default::default()
                        },
                        position_update: PositionUpdate {
                            liquidity: 10,
                            ..Default::default()
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint zero values
            // Lower tick initialized, liquidity increase, checkpoint zero values
            // Upper tick already initialized, liquidity increase
            #[test]
            fn pos_delta_current_tick_below_xo_lower_oo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            ..Default::default()
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint underflowed values
            // Lower tick initialized, liquidity increase, checkpoint zero values
            // Upper tick already initialized, has non-zero checkpoint values
            // Simulates two left tick crossings in order to reach underflow edge case
            #[test]
            fn pos_delta_current_tick_below_xo_lower_oo_upper_underflow() {
                // Underflow occurs when the lower tick is newly initialized and the upper tick
                // is already initialized with non-zero growth checkpoints.

                // The upper tick only has non-zero checkpoints when it was either 1) initialized
                // when current tick is above or 2) when it was crossed after some global fee growth
                // occurred.

                // This test simulates two tick crossings from right to left before adding liquidity
                // to the position.
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(10),
                });
                test.cross_tick(TickLabel::Upper, Direction::Left);
                // Check crossing an upper tick with liquidity added new globalpool liquidity
                assert_eq!(test.globalpool.liquidity, 110);
                // 1 = 0 + (100/100)
                test.increment_globalpool_fee_growths(to_x64(10), to_x64(10));
                test.cross_tick(TickLabel::Lower, Direction::Left);
                // Lower tick has 0 net liquidity, so crossing does not affect globalpool liquidity
                assert_eq!(test.globalpool.liquidity, 110);
                // 1.909 = 1 + (100/110)

                // Create position which initializes the lower tick
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    300,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        // Current tick below position, so does not add to globalpool liquidity
                        globalpool_liquidity: 110,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            // Wrapped underflow -10 = 20 - (20 - 0) - (10)
                            fee_growth_checkpoint_a: 340282366920938463278907166694672695296,
                            // Wrapped underflow -10
                            fee_growth_checkpoint_b: 340282366920938463278907166694672695296,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(10),
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint zero values
            // Lower tick already initialized, liquidity increase
            // Upper tick already initialized, liquidity increase, checkpoint zero values
            #[test]
            fn pos_delta_current_tick_below_oo_lower_xo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: 20,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: -10,
                            ..Default::default()
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint zero values
            // Lower tick already initialized, liquidity increase
            // Upper tick already initialized, liquidity increase
            #[test]
            fn pos_delta_current_tick_below_oo_lower_oo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: 20,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            ..Default::default()
                        },
                    },
                );
            }
        }

        // Current tick inside position
        // Globalpool virtual liquidity increases
        mod current_tick_inside {
            use crate::{
                manager::liquidity_manager::_calculate_modify_liquidity, state::*, util::*,
            };

            // LiquidityPosition liquidity increase, checkpoint zero values
            // Lower tick initialized, liquidity increase, checkpoint current values
            // Upper tick initialized, liquidity increase, checkpoint zero values
            #[test]
            fn pos_delta_current_tick_inside_xo_lower_xo_upper() {
                // Both ticks are uninitialized. This is the first position to use this tick range
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Inside,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: 0,
                    fee_growth_global_b: 0,
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 110,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: -10,
                            ..Default::default()
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint zero values
            // Lower tick initialized, liquidity increase, checkpoint current values
            // Upper already initialized, liquidity increase
            #[test]
            fn pos_delta_current_tick_inside_xo_lower_oo_upper() {
                // This is the first position to use this tick range
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Inside,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 110,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(20),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            ..Default::default()
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint underflowed values
            // Lower tick initialized, liquidity increase, checkpoint current values
            // Upper already initialized, liquidity increase
            // Simulates one left tick crossings in order to reach underflow edge case
            #[test]
            fn pos_delta_current_tick_inside_xo_lower_oo_upper_underflow() {
                // Underflow occurs when the lower tick is newly initialized and the upper tick
                // is already initialized with non-zero growth checkpoints.

                // The upper tick only has non-zero checkpoints when it was either 1) initialized
                // when current tick is above or 2) when it was crossed after some global fee growth
                // occurred.

                // This test simulates one tick crossing from left to right before adding liquidity
                // to the position.
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(10),
                });
                test.cross_tick(TickLabel::Upper, Direction::Left);
                // Check crossing an upper tick with liquidity added new globalpool liquidity
                assert_eq!(test.globalpool.liquidity, 110);

                // Create position which initializes the lower tick
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    200,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        // Current tick inside position, so globalpool liquidity increases
                        globalpool_liquidity: 120,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            // Wrapped underflow -10
                            fee_growth_checkpoint_a: 340282366920938463278907166694672695296,
                            // Wrapped underflow -10
                            fee_growth_checkpoint_b: 340282366920938463278907166694672695296,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(10),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(10),
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint current inside growth values
            // Lower tick already initialized, liquidity increase
            // Upper tick initialized, liquidity increase, checkpoint zero values
            #[test]
            fn pos_delta_current_tick_inside_oo_lower_xo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Inside,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 110,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            fee_growth_checkpoint_a: to_x64(10),
                            fee_growth_checkpoint_b: to_x64(20),
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: 20,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: -10,
                            ..Default::default()
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint current inside growth values
            // Lower tick already initialized, liquidity increase
            // Upper tick already initialized, liquidity increase
            #[test]
            fn pos_delta_current_tick_inside_oo_lower_oo_upper() {
                // Ticks already initialized with liquidity from other position
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Inside,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 110,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            fee_growth_checkpoint_a: to_x64(10),
                            fee_growth_checkpoint_b: to_x64(20),
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: 20,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            ..Default::default()
                        },
                    },
                );
            }
        }

        // Current tick above position
        // Globalpool virtual liquidity does not change
        mod current_tick_above {
            use crate::{
                manager::liquidity_manager::_calculate_modify_liquidity, state::*, util::*,
            };

            // LiquidityPosition liquidity increase, checkpoint zero values
            // Lower tick initialized, liquidity increase, checkpoint current values
            // Upper tick initialized, liquidity increase, checkpoint current values
            #[test]
            fn pos_delta_current_tick_above_xo_lower_xo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(20),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: -10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(20),
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint underflowed values
            // Lower tick initialized, liquidity increase, checkpoint current values
            // Upper tick already initialized, liquidity increase
            #[test]
            fn pos_delta_current_tick_above_xo_lower_oo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            // Wrapped underflow -10
                            fee_growth_checkpoint_a: 340282366920938463278907166694672695296,
                            // Wrapped underflow -20
                            fee_growth_checkpoint_b: 340282366920938463094439725957577179136,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(20),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            ..Default::default()
                        },
                    },
                );
            }

            // Adds liquidity to a new position where the checkpoints underflow.
            // Simulates the globalpool current tick moving below the upper tick, accruing fees,
            // and then moving back above the tick. The calculated owed token amounts
            // are verified to be correct with underflowed checkpoints.
            #[test]
            fn pos_delta_current_tick_above_xo_lower_oo_upper_underflow_owed_amounts_ok() {
                // l < u < c, t = 0 to 100
                // global fee growth a: 10, fee growth b: 10
                // create new position with 10 liquidity
                // lower tick initialized now - checkpoint current growths
                // upper tick already initialized with zero value checkpoints
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(10),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            // Wrapped underflow -10
                            fee_growth_checkpoint_a: 340282366920938463278907166694672695296,
                            // Wrapped underflow -10
                            fee_growth_checkpoint_b: 340282366920938463278907166694672695296,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(10),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            ..Default::default()
                        },
                    },
                );
                test.apply_update(&update);

                // l < c < u, t = 100 to 200
                // simulate crossing upper tick from right to left (price decrease)
                // global fee growth a: 20, fee growth b: 20
                // upper tick checkpoints are inverted
                // -120, 0, 120
                test.increment_globalpool_fee_growths(to_x64(10), to_x64(10));
                test.cross_tick(TickLabel::Upper, Direction::Left);

                assert_eq!(
                    test.tick_upper,
                    Tick {
                        initialized: true,
                        liquidity_net: -20,
                        liquidity_gross: 20,
                        // 20 = 20 - 0
                        fee_growth_outside_a: to_x64(20),
                        // 20 = 20 - 0
                        fee_growth_outside_b: to_x64(20),
                        ..Default::default()
                    }
                );

                // l < u < c, t = 200 to 300
                // simulate crossing upper tick from left to right (price increase)
                // global fee growth a: 35, fee growth b: 35
                // upper tick checkpoints are inverted
                test.increment_globalpool_fee_growths(to_x64(15), to_x64(15));

                test.cross_tick(TickLabel::Upper, Direction::Right);
                assert_eq!(
                    test.tick_upper,
                    Tick {
                        initialized: true,
                        liquidity_net: -20,
                        liquidity_gross: 20,
                        liquidity_borrowed: 0,
                        // 15 = 35 - 20
                        fee_growth_outside_a: to_x64(15),
                        // 15 = 35 - 20
                        fee_growth_outside_b: to_x64(15),
                    }
                );

                // t = 300 to 400, recalculate position fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    400,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            fee_growth_checkpoint_a: to_x64(5),
                            fee_owed_a: 150,
                            fee_growth_checkpoint_b: to_x64(5),
                            fee_owed_b: 150,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: 10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(10),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -20,
                            liquidity_gross: 20,
                            liquidity_borrowed: 0,
                            // 15
                            fee_growth_outside_a: to_x64(15),
                            // 15
                            fee_growth_outside_b: to_x64(15),
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint current values
            // Lower tick already initialized, liquidity increase
            // Upper tick initialized, liquidity increase, checkpoint current values
            #[test]
            fn pos_delta_current_tick_above_oo_lower_xo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            fee_growth_checkpoint_a: to_x64(10),
                            fee_growth_checkpoint_b: to_x64(20),
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: 20,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 10,
                            liquidity_net: -10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(20),
                        },
                    },
                );
            }

            // LiquidityPosition liquidity increase, checkpoint zero values
            // Lower tick already initialized, liquidity increase
            // Upper tick already initialized, liquidity increase
            #[test]
            fn pos_delta_current_tick_above_oo_lower_oo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: 20,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            ..Default::default()
                        },
                    },
                );
            }

            // Use non-zero checkpoints for already initialized ticks
            // LiquidityPosition liquidity increase, checkpoint current fee growth inside values
            // Lower tick already initialized, liquidity increase
            // Upper tick already initialized, liquidity increase
            #[test]
            fn pos_delta_current_tick_above_oo_lower_oo_upper_non_zero_checkpoints() {
                // Test fixture is set up to simulate globalpool at state T1.
                // T0 - current tick inside position, global fees at 10.
                //    - Some other position already exists using these tick bounds.
                //    - Price gets pushed above upper tick.
                // T1 - current tick above position, global fees at 20.
                //    - Deposit liquidity into new position.
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(20),
                    fee_growth_global_b: to_x64(20),
                });

                test.tick_lower.fee_growth_outside_a = to_x64(10);
                test.tick_lower.fee_growth_outside_b = to_x64(10);
                test.tick_upper.fee_growth_outside_a = to_x64(20);
                test.tick_upper.fee_growth_outside_b = to_x64(20);

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    10,
                    300,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate {
                            liquidity: 10,
                            fee_growth_checkpoint_a: to_x64(10),
                            fee_growth_checkpoint_b: to_x64(10),
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: 20,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(10),
                            fee_growth_outside_b: to_x64(10),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_gross: 20,
                            liquidity_net: -20,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(20),
                            fee_growth_outside_b: to_x64(20),
                        },
                    },
                );
            }
        }
    }

    // LiquidityPosition with positive liquidity transitions to zero liquidity
    // Only possible with negative liquidity delta values
    mod ox_position {

        mod current_tick_below {
            use crate::{
                manager::liquidity_manager::_calculate_modify_liquidity, state::*, util::*,
            };

            #[test]
            fn neg_delta_current_tick_below_ox_lower_ox_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 100,
                    position_liquidity: 10,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    -10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate::default(),
                        tick_lower_update: TickUpdate::default(),
                        tick_upper_update: TickUpdate::default(),
                    },
                );
            }

            #[test]
            fn neg_delta_current_tick_below_oo_lower_oo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 100,
                    position_liquidity: 10,
                    tick_lower_liquidity_gross: 20,
                    tick_upper_liquidity_gross: 20,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    -10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate::default(),
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 10,
                            liquidity_gross: 10,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -10,
                            liquidity_gross: 10,
                            ..Default::default()
                        },
                    },
                );
            }

            #[test]
            fn neg_delta_current_tick_below_oo_lower_oo_upper_non_zero_checkpoints() {
                // Test fixture is set up to simulate globalpool at state T2.
                // T0 - current tick above position, global fees at 100.
                //    - Deposit liquidity into new position.
                // T1 - current tick inside position, global fees at 150.
                // T2 - current tick below position, global fees at 200.
                //    - Remove all liquidity.
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 1000,
                    position_liquidity: 10,
                    tick_lower_liquidity_gross: 20,
                    tick_upper_liquidity_gross: 20,
                    fee_growth_global_a: to_x64(200),
                    fee_growth_global_b: to_x64(200),
                });

                // Time starts at 30_000. Increments of 10_000 seconds with 1000 globalpool liquidity.
                test.tick_lower.fee_growth_outside_a = to_x64(100);
                test.tick_lower.fee_growth_outside_b = to_x64(100);

                test.tick_upper.fee_growth_outside_a = to_x64(50);
                test.tick_upper.fee_growth_outside_b = to_x64(50);

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    -10,
                    40_000,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 1000,
                        position_update: PositionUpdate {
                            liquidity: 0,
                            fee_growth_checkpoint_a: to_x64(50),
                            fee_owed_a: 500,
                            fee_growth_checkpoint_b: to_x64(50),
                            fee_owed_b: 500,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 10,
                            liquidity_gross: 10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(100),
                            fee_growth_outside_b: to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -10,
                            liquidity_gross: 10,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(50),
                            fee_growth_outside_b: to_x64(50),
                        },
                    },
                );
            }
        }

        mod current_tick_inside {
            use crate::{
                manager::liquidity_manager::_calculate_modify_liquidity, state::*, util::*,
            };

            #[test]
            fn neg_delta_current_tick_inside_ox_lower_ox_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Inside,
                    globalpool_liquidity: 100,
                    position_liquidity: 10,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    -10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 90,
                        position_update: PositionUpdate {
                            liquidity: 0,
                            fee_growth_checkpoint_a: to_x64(10),
                            fee_owed_a: 100,
                            fee_growth_checkpoint_b: to_x64(20),
                            fee_owed_b: 200,
                        },
                        tick_lower_update: TickUpdate::default(),
                        tick_upper_update: TickUpdate::default(),
                    },
                );
            }

            #[test]
            fn neg_delta_current_tick_inside_oo_lower_oo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Inside,
                    globalpool_liquidity: 100,
                    position_liquidity: 10,
                    tick_lower_liquidity_gross: 20,
                    tick_upper_liquidity_gross: 20,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    -10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 90,
                        position_update: PositionUpdate {
                            liquidity: 0,
                            fee_growth_checkpoint_a: to_x64(10),
                            fee_owed_a: 100,
                            fee_growth_checkpoint_b: to_x64(20),
                            fee_owed_b: 200,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 10,
                            liquidity_gross: 10,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -10,
                            liquidity_gross: 10,
                            ..Default::default()
                        },
                    },
                );
            }
        }

        mod current_tick_above {
            use crate::{
                manager::liquidity_manager::_calculate_modify_liquidity, state::*, util::*,
            };

            #[test]
            fn neg_delta_current_tick_above_ox_lower_ox_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 10,
                    tick_lower_liquidity_gross: 10,
                    tick_upper_liquidity_gross: 10,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    -10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate::default(),
                        tick_lower_update: TickUpdate::default(),
                        tick_upper_update: TickUpdate::default(),
                    },
                );
            }

            #[test]
            fn neg_delta_current_tick_above_oo_lower_oo_upper() {
                let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 100,
                    position_liquidity: 10,
                    tick_lower_liquidity_gross: 20,
                    tick_upper_liquidity_gross: 20,
                    fee_growth_global_a: to_x64(10),
                    fee_growth_global_b: to_x64(20),
                });
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    -10,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 100,
                        position_update: PositionUpdate::default(),
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 10,
                            liquidity_gross: 10,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -10,
                            liquidity_gross: 10,
                            ..Default::default()
                        },
                    },
                );
            }
        }
    }

    // LiquidityPosition with positive liquidity remains in positive liquidity state
    // Only possible with lower and upper ticks that are already initialized (oo, oo)
    mod oo_position {
        use crate::{manager::liquidity_manager::_calculate_modify_liquidity, state::*, util::*};

        // Liquidity + tick states remain the same
        // Only fee growth changes
        #[test]
        fn zero_delta_current_tick_below() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Below,
                globalpool_liquidity: 100,
                position_liquidity: 10,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(10),
                fee_growth_global_b: to_x64(20),
            });
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                0,
                100,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 100,
                    position_update: PositionUpdate {
                        liquidity: 10,
                        ..Default::default()
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_net: 10,
                        liquidity_gross: 10,
                        ..Default::default()
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_net: -10,
                        liquidity_gross: 10,
                        ..Default::default()
                    },
                },
            );
        }

        #[test]
        fn zero_delta_current_tick_inside() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Inside,
                globalpool_liquidity: 100,
                position_liquidity: 10,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(10),
                fee_growth_global_b: to_x64(20),
            });
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                0,
                100,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 100,
                    position_update: PositionUpdate {
                        liquidity: 10,
                        fee_growth_checkpoint_a: to_x64(10),
                        fee_owed_a: 100,
                        fee_growth_checkpoint_b: to_x64(20),
                        fee_owed_b: 200,
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_net: 10,
                        liquidity_gross: 10,
                        ..Default::default()
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_net: -10,
                        liquidity_gross: 10,
                        ..Default::default()
                    },
                },
            );
        }

        #[test]
        fn zero_delta_current_tick_above() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Above,
                globalpool_liquidity: 100,
                position_liquidity: 10,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(10),
                fee_growth_global_b: to_x64(20),
            });
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                0,
                100,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 100,
                    position_update: PositionUpdate {
                        liquidity: 10,
                        ..Default::default()
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_net: 10,
                        liquidity_gross: 10,
                        ..Default::default()
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_net: -10,
                        liquidity_gross: 10,
                        ..Default::default()
                    },
                },
            );
        }

        // LiquidityPosition liquidity increases
        #[test]
        fn pos_delta_current_tick_below() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Below,
                globalpool_liquidity: 100,
                position_liquidity: 10,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(10),
                fee_growth_global_b: to_x64(20),
            });
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                10,
                100,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 100,
                    position_update: PositionUpdate {
                        liquidity: 20,
                        ..Default::default()
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_net: 20,
                        liquidity_gross: 20,
                        ..Default::default()
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_net: -20,
                        liquidity_gross: 20,
                        ..Default::default()
                    },
                },
            );
        }

        #[test]
        fn pos_delta_current_tick_inside() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Inside,
                globalpool_liquidity: 100,
                position_liquidity: 10,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(10),
                fee_growth_global_b: to_x64(20),
            });
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                10,
                100,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 110,
                    position_update: PositionUpdate {
                        liquidity: 20,
                        fee_growth_checkpoint_a: to_x64(10),
                        fee_owed_a: 100,
                        fee_growth_checkpoint_b: to_x64(20),
                        fee_owed_b: 200,
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_net: 20,
                        liquidity_gross: 20,
                        ..Default::default()
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_net: -20,
                        liquidity_gross: 20,
                        ..Default::default()
                    },
                },
            );
        }

        #[test]
        fn pos_delta_current_tick_above() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Above,
                globalpool_liquidity: 100,
                position_liquidity: 10,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(10),
                fee_growth_global_b: to_x64(20),
            });
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                10,
                100,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 100,
                    position_update: PositionUpdate {
                        liquidity: 20,
                        ..Default::default()
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_net: 20,
                        liquidity_gross: 20,
                        ..Default::default()
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_net: -20,
                        liquidity_gross: 20,
                        ..Default::default()
                    },
                },
            );
        }

        // LiquidityPosition liquidity decreases by partial amount
        #[test]
        fn neg_delta_current_tick_below() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Below,
                globalpool_liquidity: 100,
                position_liquidity: 10,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(10),
                fee_growth_global_b: to_x64(20),
            });
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                -5,
                100,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 100,
                    position_update: PositionUpdate {
                        liquidity: 5,
                        ..Default::default()
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_net: 5,
                        liquidity_gross: 5,
                        ..Default::default()
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_net: -5,
                        liquidity_gross: 5,
                        ..Default::default()
                    },
                },
            );
        }

        #[test]
        fn neg_delta_current_tick_inside() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Inside,
                globalpool_liquidity: 100,
                position_liquidity: 10,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(10),
                fee_growth_global_b: to_x64(20),
            });
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                -5,
                100,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 95,
                    position_update: PositionUpdate {
                        liquidity: 5,
                        fee_growth_checkpoint_a: to_x64(10),
                        fee_owed_a: 100,
                        fee_growth_checkpoint_b: to_x64(20),
                        fee_owed_b: 200,
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_net: 5,
                        liquidity_gross: 5,
                        ..Default::default()
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_net: -5,
                        liquidity_gross: 5,
                        ..Default::default()
                    },
                },
            );
        }

        #[test]
        fn neg_delta_current_tick_above() {
            let test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Above,
                globalpool_liquidity: 100,
                position_liquidity: 10,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(10),
                fee_growth_global_b: to_x64(20),
            });
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                -5,
                100,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 100,
                    position_update: PositionUpdate {
                        liquidity: 5,
                        ..Default::default()
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_net: 5,
                        liquidity_gross: 5,
                        ..Default::default()
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_net: -5,
                        liquidity_gross: 5,
                        ..Default::default()
                    },
                },
            );
        }
    }

    mod fees {
        use crate::{manager::liquidity_manager::_calculate_modify_liquidity, state::*, util::*};

        // Add liquidity to new position, accrue fees, remove all liquidity.
        // This test checks that accrued fees are properly accounted even when all
        // liquidity has been removed from a position and the ticks are still initialized.
        #[test]
        fn accrued_tokens_ok_closed_position_ticks_remain_initialized() {
            // Globalpool with 1000 liquidity, fees (a: 100, b: 200)
            // Lower Tick with 10 liquidity, existing fee checkpoints (a: 10, b: 20)
            // Upper Tick with 10 liquidity, existing fee checkpoints (a: 1, b: 2)
            let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                curr_index_loc: CurrIndex::Inside,
                globalpool_liquidity: 1000,
                position_liquidity: 0,
                tick_lower_liquidity_gross: 10,
                tick_upper_liquidity_gross: 10,
                fee_growth_global_a: to_x64(100),
                fee_growth_global_b: to_x64(200),
            });

            test.tick_lower.fee_growth_outside_a = to_x64(10);
            test.tick_lower.fee_growth_outside_b = to_x64(20);

            test.tick_upper.fee_growth_outside_a = to_x64(1);
            test.tick_upper.fee_growth_outside_b = to_x64(2);

            // Add 100 liquidity
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                100,
                100,
            )
            .unwrap();

            assert_eq!(
                update.position_update,
                PositionUpdate {
                    liquidity: 100,
                    fee_growth_checkpoint_a: to_x64(89), // 100 - 10 - 1
                    fee_growth_checkpoint_b: to_x64(178), // 200 - 20 - 2
                    ..Default::default()
                }
            );
            test.apply_update(&update);

            // Add 50 more liquidity
            test.increment_globalpool_fee_growths(to_x64(10), to_x64(20));
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                50,
                200,
            )
            .unwrap();

            assert_eq!(
                update.position_update,
                PositionUpdate {
                    liquidity: 150,
                    fee_growth_checkpoint_a: to_x64(99), // 110 - 10 - 1
                    fee_owed_a: 1000,
                    fee_growth_checkpoint_b: to_x64(198), // 220 - 20 - 2
                    fee_owed_b: 2000,
                }
            );
            test.apply_update(&update);

            // Remove all 150 liquidity
            test.increment_globalpool_fee_growths(to_x64(10), to_x64(20));
            let update = _calculate_modify_liquidity(
                &test.globalpool,
                &test.position,
                &test.tick_lower,
                &test.tick_upper,
                test.position.tick_lower_index,
                test.position.tick_upper_index,
                -150,
                300,
            )
            .unwrap();

            assert_modify_liquidity(
                &update,
                &ModifyLiquidityExpectation {
                    globalpool_liquidity: 1000,
                    position_update: PositionUpdate {
                        liquidity: 0,
                        fee_growth_checkpoint_a: to_x64(109), // 120 - 10 - 1
                        fee_owed_a: 2500,
                        fee_growth_checkpoint_b: to_x64(218), // 240 - 20 - 2
                        fee_owed_b: 5000,
                    },
                    tick_lower_update: TickUpdate {
                        initialized: true,
                        liquidity_gross: 10,
                        liquidity_net: 10,
                        liquidity_borrowed: 0,
                        fee_growth_outside_a: to_x64(10),
                        fee_growth_outside_b: to_x64(20),
                    },
                    tick_upper_update: TickUpdate {
                        initialized: true,
                        liquidity_gross: 10,
                        liquidity_net: -10,
                        liquidity_borrowed: 0,
                        fee_growth_outside_a: to_x64(1),
                        fee_growth_outside_b: to_x64(2),
                    },
                },
            );
        }

        // Test overflow accounting of global fee accumulators
        mod global_accumulators_overflow {
            use crate::{
                manager::liquidity_manager::_calculate_modify_liquidity, state::*, util::*,
            };

            // t1 |---c1---l----------------u--------| open position (checkpoint)
            // t2 |--------l-------c2-------u--------| cross right, accrue tokens
            // t3 |---c3---l----------------u--------| cross left, overflow
            #[test]
            fn overflow_below_checkpoint_below() {
                // t1 - open position (checkpoint)
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 10000,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: u128::MAX - to_x64(100),
                    fee_growth_global_b: u128::MAX - to_x64(100),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    1000,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                assert_eq!(test.globalpool.fee_growth_global_a, u128::MAX - to_x64(100));
                assert_eq!(test.globalpool.fee_growth_global_b, u128::MAX - to_x64(100));

                test.apply_update(&update);
                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -80

                // t2 - cross right, accrue tokens in position
                test.cross_tick(TickLabel::Lower, Direction::Right);
                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -60 // 300

                // t3 - cross left, overflow
                test.cross_tick(TickLabel::Lower, Direction::Left);
                test.increment_globalpool_fee_growths(to_x64(70), to_x64(70)); // fees overflow to 10

                // Calculate fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    600,
                )
                .unwrap();
                test.apply_update(&update);

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            fee_growth_checkpoint_a: to_x64(20),
                            fee_owed_a: 20000,
                            fee_growth_checkpoint_b: to_x64(20),
                            fee_owed_b: 20000,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(20),
                            fee_growth_outside_b: to_x64(20),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                // 10
                assert_eq!(test.globalpool.fee_growth_global_a, 184467440737095516159);
                assert_eq!(test.globalpool.fee_growth_global_b, 184467440737095516159);
            }

            // t1 |--------l-------c1-------u--------| open position (checkpoint)
            // t2 |--------l-------c2-------u--------| accrue tokens, cross left
            // t3 |---c3---l----------------u--------| overflow
            #[test]
            fn overflow_below_checkpoint_inside() {
                // t1 - open position (checkpoint)
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Inside,
                    globalpool_liquidity: 10000,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: u128::MAX - to_x64(100),
                    fee_growth_global_b: u128::MAX - to_x64(100),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    1000,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 11000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                assert_eq!(test.globalpool.fee_growth_global_a, u128::MAX - to_x64(100));
                assert_eq!(test.globalpool.fee_growth_global_b, u128::MAX - to_x64(100));

                test.apply_update(&update);

                // t2 - accrue tokens, cross left
                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -80
                test.cross_tick(TickLabel::Lower, Direction::Left);

                // t3 - overflow
                test.increment_globalpool_fee_growths(to_x64(90), to_x64(90)); // fees overflow to 10

                // Calculate fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    600,
                )
                .unwrap();
                test.apply_update(&update);

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            fee_growth_checkpoint_a: to_x64(20),
                            fee_owed_a: 20000,
                            fee_growth_checkpoint_b: to_x64(20),
                            fee_owed_b: 20000,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(20),
                            fee_growth_outside_b: to_x64(20),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                // 10
                assert_eq!(test.globalpool.fee_growth_global_a, 184467440737095516159);
                assert_eq!(test.globalpool.fee_growth_global_b, 184467440737095516159);
            }

            // t1 |--------l----------------u---c1---| open position (checkpoint), cross left
            // t2 |--------l-------c2-------u--------| accrue tokens, cross left
            // t3 |---c3---l----------------u--------| overflow
            #[test]
            fn overflow_below_checkpoint_above() {
                // t1 - open position (checkpoint)
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 10000,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: u128::MAX - to_x64(100),
                    fee_growth_global_b: u128::MAX - to_x64(100),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    1000,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                    },
                );
                assert_eq!(test.globalpool.fee_growth_global_a, u128::MAX - to_x64(100));
                assert_eq!(test.globalpool.fee_growth_global_b, u128::MAX - to_x64(100));

                test.apply_update(&update);

                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -80
                test.cross_tick(TickLabel::Upper, Direction::Left);

                // t2 - accrue tokens, cross left
                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -60
                test.cross_tick(TickLabel::Lower, Direction::Left);

                // t3 - overflow
                test.increment_globalpool_fee_growths(to_x64(70), to_x64(70)); // fees overflow to 10

                // Calculate fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    600,
                )
                .unwrap();
                test.apply_update(&update);

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            fee_growth_checkpoint_a: to_x64(20),
                            fee_owed_a: 20000,
                            fee_growth_checkpoint_b: to_x64(20),
                            fee_owed_b: 20000,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(40),
                            fee_growth_outside_b: to_x64(40),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(20),
                            fee_growth_outside_b: to_x64(20), // 1
                        },
                    },
                );
                // 10
                assert_eq!(test.globalpool.fee_growth_global_a, 184467440737095516159);
                assert_eq!(test.globalpool.fee_growth_global_b, 184467440737095516159);
            }

            // t1 |---c1---l----------------u--------| open position (checkpoint), cross right
            // t2 |--------l-------c2-------u--------| accrue tokens, overflow
            #[test]
            fn overflow_inside_checkpoint_below() {
                // t1 - open position (checkpoint)
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 10000,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: u128::MAX - to_x64(100),
                    fee_growth_global_b: u128::MAX - to_x64(100),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    1000,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                assert_eq!(test.globalpool.fee_growth_global_a, u128::MAX - to_x64(100));
                assert_eq!(test.globalpool.fee_growth_global_b, u128::MAX - to_x64(100));

                test.apply_update(&update);

                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -80
                test.cross_tick(TickLabel::Lower, Direction::Right);

                // t2 - accrue tokens, overflow
                test.increment_globalpool_fee_growths(to_x64(90), to_x64(90)); // fees overflow to 10

                // Calculate fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    600,
                )
                .unwrap();
                test.apply_update(&update);

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 11000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            fee_growth_checkpoint_a: to_x64(90),
                            fee_owed_a: 90000,
                            fee_growth_checkpoint_b: to_x64(90),
                            fee_owed_b: 90000,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(80),
                            fee_growth_outside_b: u128::MAX - to_x64(80),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                // 10
                assert_eq!(test.globalpool.fee_growth_global_a, 184467440737095516159);
                assert_eq!(test.globalpool.fee_growth_global_b, 184467440737095516159);
            }

            // t1 |--------l-------c1-------u--------| open position (checkpoint)
            // t2 |--------l-------c2-------u--------| accrue tokens, overflow
            #[test]
            fn overflow_inside_checkpoint_inside() {
                // t1 - open position (checkpoint)
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Inside,
                    globalpool_liquidity: 9000,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: u128::MAX - to_x64(100),
                    fee_growth_global_b: u128::MAX - to_x64(100),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    1000,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                assert_eq!(test.globalpool.fee_growth_global_a, u128::MAX - to_x64(100));
                assert_eq!(test.globalpool.fee_growth_global_b, u128::MAX - to_x64(100));

                test.apply_update(&update);

                // t2 - accrue tokens, overflow
                test.increment_globalpool_fee_growths(to_x64(110), to_x64(110)); // fees overflow to 10

                // Calculate fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    600,
                )
                .unwrap();
                test.apply_update(&update);

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            fee_growth_checkpoint_a: to_x64(110),
                            fee_owed_a: 110000,
                            fee_growth_checkpoint_b: to_x64(110),
                            fee_owed_b: 110000,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                // 10
                assert_eq!(test.globalpool.fee_growth_global_a, 184467440737095516159);
                assert_eq!(test.globalpool.fee_growth_global_b, 184467440737095516159);
            }

            // t1 |--------l----------------u---c1---| open position (checkpoint), cross left
            // t2 |--------l-------c2-------u--------| accrue tokens, overflow
            #[test]
            fn overflow_inside_checkpoint_above() {
                // t1 - open position (checkpoint)
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 9000,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: u128::MAX - to_x64(100),
                    fee_growth_global_b: u128::MAX - to_x64(100),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    1000,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 9000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                    },
                );
                assert_eq!(test.globalpool.fee_growth_global_a, u128::MAX - to_x64(100));
                assert_eq!(test.globalpool.fee_growth_global_b, u128::MAX - to_x64(100));

                test.apply_update(&update);
                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -80
                test.cross_tick(TickLabel::Upper, Direction::Left);

                // t2 - accrue tokens, overflow
                test.increment_globalpool_fee_growths(to_x64(90), to_x64(90)); // fees overflow to 10

                // Calculate fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    600,
                )
                .unwrap();
                test.apply_update(&update);

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            fee_growth_checkpoint_a: to_x64(90),
                            fee_owed_a: 90000,
                            fee_growth_checkpoint_b: to_x64(90),
                            fee_owed_b: 90000,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: to_x64(20),
                            fee_growth_outside_b: to_x64(20),
                        },
                    },
                );
                // 10
                assert_eq!(test.globalpool.fee_growth_global_a, 184467440737095516159);
                assert_eq!(test.globalpool.fee_growth_global_b, 184467440737095516159);
            }

            // t1 |---c1---l----------------u--------| open position (checkpoint), cross right
            // t2 |--------l-------c2-------u--------| accrue tokens, cross right
            // t3 |--------l----------------u---c3---| overflow
            #[test]
            fn overflow_above_checkpoint_below() {
                // t1 - open position (checkpoint)
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Below,
                    globalpool_liquidity: 10000,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: u128::MAX - to_x64(100),
                    fee_growth_global_b: u128::MAX - to_x64(100),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    1000,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                assert_eq!(test.globalpool.fee_growth_global_a, u128::MAX - to_x64(100));
                assert_eq!(test.globalpool.fee_growth_global_b, u128::MAX - to_x64(100));

                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -80
                test.cross_tick(TickLabel::Lower, Direction::Right);

                // // t2 - accrue tokens, cross right
                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -60
                test.cross_tick(TickLabel::Upper, Direction::Right);

                // t3 - overflow
                test.increment_globalpool_fee_growths(to_x64(70), to_x64(70)); // fees overflow to 10

                // Calculate fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    600,
                )
                .unwrap();
                test.apply_update(&update);

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            // 20 = 10 - (-80) - (10 - (-60))
                            fee_growth_checkpoint_a: to_x64(20),
                            fee_owed_a: 20000,
                            fee_growth_checkpoint_b: to_x64(20),
                            fee_owed_b: 20000,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(80),
                            fee_growth_outside_b: u128::MAX - to_x64(80),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(60),
                            fee_growth_outside_b: u128::MAX - to_x64(60),
                        },
                    },
                );
                // 10
                assert_eq!(test.globalpool.fee_growth_global_a, 184467440737095516159);
                assert_eq!(test.globalpool.fee_growth_global_b, 184467440737095516159);
            }

            // t1 |--------l-------c1-------u--------| open position (checkpoint)
            // t2 |--------l-------c2-------u--------| accrue tokens, cross right
            // t3 |--------l----------------u---c3---| overflow
            #[test]
            fn overflow_above_checkpoint_inside() {
                // t1 - open position (checkpoint)
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Inside,
                    globalpool_liquidity: 10000,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: u128::MAX - to_x64(100),
                    fee_growth_global_b: u128::MAX - to_x64(100),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    1000,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 11000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            ..Default::default()
                        },
                    },
                );
                assert_eq!(test.globalpool.fee_growth_global_a, u128::MAX - to_x64(100));
                assert_eq!(test.globalpool.fee_growth_global_b, u128::MAX - to_x64(100));

                test.apply_update(&update);

                // t2 -accrue tokens, cross right
                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -80
                test.cross_tick(TickLabel::Upper, Direction::Right);

                // t3 - overflow
                test.increment_globalpool_fee_growths(to_x64(90), to_x64(90)); // fees overflow to 10

                // Calculate fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    600,
                )
                .unwrap();
                test.apply_update(&update);

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            fee_growth_checkpoint_a: to_x64(20),
                            fee_owed_a: 20000,
                            fee_growth_checkpoint_b: to_x64(20),
                            fee_owed_b: 20000,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(80),
                            fee_growth_outside_b: u128::MAX - to_x64(80),
                        },
                    },
                );
                // 10
                assert_eq!(test.globalpool.fee_growth_global_a, 184467440737095516159);
                assert_eq!(test.globalpool.fee_growth_global_b, 184467440737095516159);
            }

            // t1 |--------l----------------u---c1---| open position (checkpoint), cross left
            // t2 |--------l-------c2-------u--------| accrue tokens, cross right
            // t3 |--------l----------------u---c3---| overflow
            #[test]
            fn overflow_above_checkpoint_above() {
                // t1 - open position (checkpoint)
                let mut test = LiquidityTestFixture::new(LiquidityTestFixtureInfo {
                    curr_index_loc: CurrIndex::Above,
                    globalpool_liquidity: 10000,
                    position_liquidity: 0,
                    tick_lower_liquidity_gross: 0,
                    tick_upper_liquidity_gross: 0,
                    fee_growth_global_a: u128::MAX - to_x64(100),
                    fee_growth_global_b: u128::MAX - to_x64(100),
                });

                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    1000,
                    100,
                )
                .unwrap();

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            ..Default::default()
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                    },
                );
                assert_eq!(test.globalpool.fee_growth_global_a, u128::MAX - to_x64(100));
                assert_eq!(test.globalpool.fee_growth_global_b, u128::MAX - to_x64(100));

                test.apply_update(&update);

                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -80
                test.cross_tick(TickLabel::Upper, Direction::Left);

                // t2 - accrue tokens, cross right
                test.increment_globalpool_fee_growths(to_x64(20), to_x64(20)); // fees at -60
                test.cross_tick(TickLabel::Upper, Direction::Right);

                // t3 - overflow
                test.increment_globalpool_fee_growths(to_x64(70), to_x64(70)); // fees overflow to 10

                // Calculate fees
                let update = _calculate_modify_liquidity(
                    &test.globalpool,
                    &test.position,
                    &test.tick_lower,
                    &test.tick_upper,
                    test.position.tick_lower_index,
                    test.position.tick_upper_index,
                    0,
                    600,
                )
                .unwrap();
                test.apply_update(&update);

                assert_modify_liquidity(
                    &update,
                    &ModifyLiquidityExpectation {
                        globalpool_liquidity: 10000,
                        position_update: PositionUpdate {
                            liquidity: 1000,
                            // 20 = 10 - (-100) - (10 - (-80))
                            fee_growth_checkpoint_a: to_x64(20),
                            fee_owed_a: 20000,
                            fee_growth_checkpoint_b: to_x64(20),
                            fee_owed_b: 20000,
                        },
                        tick_lower_update: TickUpdate {
                            initialized: true,
                            liquidity_net: 1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(100),
                            fee_growth_outside_b: u128::MAX - to_x64(100),
                        },
                        tick_upper_update: TickUpdate {
                            initialized: true,
                            liquidity_net: -1000,
                            liquidity_gross: 1000,
                            liquidity_borrowed: 0,
                            fee_growth_outside_a: u128::MAX - to_x64(80),
                            fee_growth_outside_b: u128::MAX - to_x64(80),
                        },
                    },
                );
                // 10
                assert_eq!(test.globalpool.fee_growth_global_a, 184467440737095516159);
                assert_eq!(test.globalpool.fee_growth_global_b, 184467440737095516159);
            }
        }
    }
}
