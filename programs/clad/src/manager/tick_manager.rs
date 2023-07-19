use {
    crate::{
        errors::ErrorCode,
        math::add_liquidity_delta,
        state::{Tick, TickUpdate},
    },
    anchor_lang::prelude::msg,
};

pub fn next_tick_cross_update(
    tick: &Tick,
    fee_growth_global_a: u128,
    fee_growth_global_b: u128,
) -> Result<TickUpdate, ErrorCode> {
    let mut update = TickUpdate::from(tick);

    update.fee_growth_outside_a = fee_growth_global_a.wrapping_sub(tick.fee_growth_outside_a);
    update.fee_growth_outside_b = fee_growth_global_b.wrapping_sub(tick.fee_growth_outside_b);

    Ok(update)
}

pub fn next_tick_modify_liquidity_update(
    tick: &Tick,
    tick_index: i32,
    tick_current_index: i32,
    fee_growth_global_a: u128,
    fee_growth_global_b: u128,
    liquidity_delta: i128,
    is_upper_tick: bool,
) -> Result<TickUpdate, ErrorCode> {
    // noop if there is no change in liquidity
    if liquidity_delta == 0 {
        msg!("tick {:?} has liquidity delta = 0", tick_index);
        return Ok(TickUpdate::from(tick));
    }

    let liquidity_gross = add_liquidity_delta(tick.liquidity_gross, liquidity_delta)?;

    // Update to an uninitialized tick if remaining liquidity is being removed
    if liquidity_gross == 0 {
        // return Ok(TickUpdate { liquidity_borrowed: tick.liquidity_borrowed, ..Default::default() });
        msg!("tick {:?} has liquidity gross = 0", tick_index);
        return Ok(TickUpdate::default());
    }

    let (fee_growth_outside_a, fee_growth_outside_b) = if tick.liquidity_gross == 0 {
        // By convention, assume all prior growth happened below the tick
        if tick_current_index >= tick_index {
            (fee_growth_global_a, fee_growth_global_b)
        } else {
            (0, 0)
        }
    } else {
        (tick.fee_growth_outside_a, tick.fee_growth_outside_b)
    };

    let liquidity_net = if is_upper_tick {
        tick.liquidity_net
            .checked_sub(liquidity_delta)
            .ok_or(ErrorCode::LiquidityNetError)?
    } else {
        tick.liquidity_net
            .checked_add(liquidity_delta)
            .ok_or(ErrorCode::LiquidityNetError)?
    };

    let gross = tick.liquidity_gross;
    let net = tick.liquidity_net;
    msg!(
        "liquidity (tick {:?}): gross {:?} / net {:?}",
        tick_index,
        gross,
        net
    );

    Ok(TickUpdate {
        initialized: true,
        liquidity_net,
        liquidity_gross,
        liquidity_borrowed: tick.liquidity_borrowed,
        fee_growth_outside_a,
        fee_growth_outside_b,
    })
}

pub fn next_tick_modify_liquidity_update_from_loan(
    tick: &Tick,
    tick_index: i32,
    tick_current_index: i32,
    fee_growth_global_a: u128,
    fee_growth_global_b: u128,
    liquidity_delta: i128,
    // is_borrow: bool, // true = borrow liquidity, false = repay liquidity
    is_upper_tick: bool,
) -> Result<TickUpdate, ErrorCode> {
    let mut update = next_tick_modify_liquidity_update(
        tick,
        tick_index,
        tick_current_index,
        fee_growth_global_a,
        fee_growth_global_b,
        liquidity_delta,
        is_upper_tick,
    )?;

    update.liquidity_borrowed += liquidity_delta;
    msg!("update: {:?}", update);

    Ok(update)
}

// Calculates the fee growths inside of tick_lower and tick_upper based on their
// index relative to tick_current_index.
pub fn next_fee_growths_inside(
    tick_current_index: i32,
    tick_lower: &Tick,
    tick_lower_index: i32,
    tick_upper: &Tick,
    tick_upper_index: i32,
    fee_growth_global_a: u128,
    fee_growth_global_b: u128,
) -> (u128, u128) {
    // By convention, when initializing a tick, all fees have been earned below the tick.
    let (fee_growth_below_a, fee_growth_below_b) = if !tick_lower.initialized {
        (fee_growth_global_a, fee_growth_global_b)
    } else if tick_current_index < tick_lower_index {
        (
            fee_growth_global_a.wrapping_sub(tick_lower.fee_growth_outside_a),
            fee_growth_global_b.wrapping_sub(tick_lower.fee_growth_outside_b),
        )
    } else {
        (
            tick_lower.fee_growth_outside_a,
            tick_lower.fee_growth_outside_b,
        )
    };

    // By convention, when initializing a tick, no fees have been earned above the tick.
    let (fee_growth_above_a, fee_growth_above_b) = if !tick_upper.initialized {
        (0, 0)
    } else if tick_current_index < tick_upper_index {
        (
            tick_upper.fee_growth_outside_a,
            tick_upper.fee_growth_outside_b,
        )
    } else {
        (
            fee_growth_global_a.wrapping_sub(tick_upper.fee_growth_outside_a),
            fee_growth_global_b.wrapping_sub(tick_upper.fee_growth_outside_b),
        )
    };

    (
        fee_growth_global_a
            .wrapping_sub(fee_growth_below_a)
            .wrapping_sub(fee_growth_above_a),
        fee_growth_global_b
            .wrapping_sub(fee_growth_below_b)
            .wrapping_sub(fee_growth_above_b),
    )
}

#[cfg(test)]
mod tick_manager_tests {
    use {
        crate::{
            errors::ErrorCode,
            manager::tick_manager::{
                next_fee_growths_inside, next_tick_cross_update, next_tick_modify_liquidity_update,
                TickUpdate,
            },
            math::Q64_RESOLUTION,
            state::{tick_builder::TickBuilder, Tick},
        },
        anchor_lang::prelude::Pubkey,
    };

    #[test]
    fn test_next_fee_growths_inside() {
        struct Test<'a> {
            name: &'a str,
            tick_current_index: i32,
            tick_lower: Tick,
            tick_lower_index: i32,
            tick_upper: Tick,
            tick_upper_index: i32,
            fee_growth_global_a: u128,
            fee_growth_global_b: u128,
            expected_fee_growths_inside: (u128, u128),
        }

        for test in [
            Test {
                name: "current tick index below ticks",
                tick_current_index: -200,
                tick_lower: Tick {
                    initialized: true,
                    fee_growth_outside_a: 2000,
                    fee_growth_outside_b: 1000,
                    ..Default::default()
                },
                tick_lower_index: -100,
                tick_upper: Tick {
                    initialized: true,
                    fee_growth_outside_a: 1000,
                    fee_growth_outside_b: 1000,
                    ..Default::default()
                },
                tick_upper_index: 100,
                fee_growth_global_a: 3000,
                fee_growth_global_b: 3000,
                expected_fee_growths_inside: (1000, 0),
            },
            Test {
                name: "current tick index between ticks",
                tick_current_index: -20,
                tick_lower: Tick {
                    initialized: true,
                    fee_growth_outside_a: 2000,
                    fee_growth_outside_b: 1000,
                    ..Default::default()
                },
                tick_lower_index: -20,
                tick_upper: Tick {
                    initialized: true,
                    fee_growth_outside_a: 1500,
                    fee_growth_outside_b: 1000,
                    ..Default::default()
                },
                tick_upper_index: 100,
                fee_growth_global_a: 4000,
                fee_growth_global_b: 3000,
                expected_fee_growths_inside: (500, 1000),
            },
            Test {
                name: "current tick index above ticks",
                tick_current_index: 200,
                tick_lower: Tick {
                    initialized: true,
                    fee_growth_outside_a: 2000,
                    fee_growth_outside_b: 1000,
                    ..Default::default()
                },
                tick_lower_index: -100,
                tick_upper: Tick {
                    initialized: true,
                    fee_growth_outside_a: 2500,
                    fee_growth_outside_b: 2000,
                    ..Default::default()
                },
                tick_upper_index: 100,
                fee_growth_global_a: 3000,
                fee_growth_global_b: 3000,
                expected_fee_growths_inside: (500, 1000),
            },
        ] {
            // System under test
            let (fee_growth_inside_a, fee_growth_inside_b) = next_fee_growths_inside(
                test.tick_current_index,
                &test.tick_lower,
                test.tick_lower_index,
                &test.tick_upper,
                test.tick_upper_index,
                test.fee_growth_global_a,
                test.fee_growth_global_b,
            );
            assert_eq!(
                fee_growth_inside_a, test.expected_fee_growths_inside.0,
                "{} - fee_growth_inside_a",
                test.name
            );
            assert_eq!(
                fee_growth_inside_b, test.expected_fee_growths_inside.1,
                "{} - fee_growth_inside_b",
                test.name
            );
        }
    }

    #[test]
    fn test_next_tick_modify_liquidity_update() {
        #[derive(Default)]
        struct Test<'a> {
            name: &'a str,
            tick: Tick,
            tick_index: i32,
            tick_current_index: i32,
            fee_growth_global_a: u128,
            fee_growth_global_b: u128,
            liquidity_delta: i128,
            is_upper_tick: bool,
            expected_update: TickUpdate,
        }

        for test in [
            Test {
                name: "initialize lower tick with +liquidity, current < tick.index, growths not set",
                tick: Tick::default(),
                tick_index: 200,
                tick_current_index: 100,
                liquidity_delta: 42069,
                is_upper_tick: false,
                fee_growth_global_a: 100,
                fee_growth_global_b: 100,
                expected_update: TickUpdate {
                    initialized: true,
                    liquidity_net: 42069,
                    liquidity_gross: 42069,
                    ..Default::default()
                },
            },
            Test {
                name: "initialize lower tick with +liquidity, current >= tick.index, growths get set",
                tick: Tick::default(),
                tick_index: 200,
                tick_current_index: 300,
                liquidity_delta: 42069,
                is_upper_tick: false,
                fee_growth_global_a: 100,
                fee_growth_global_b: 100,
                expected_update: TickUpdate {
                    initialized: true,
                    liquidity_net: 42069,
                    liquidity_gross: 42069,
                    liquidity_borrowed: 0,
                    fee_growth_outside_a: 100,
                    fee_growth_outside_b: 100,
                },
                ..Default::default()
            },
            Test {
                name: "lower tick +liquidity already initialized, growths not set",
                tick: TickBuilder::default()
                    .initialized(true)
                    .liquidity_net(100)
                    .liquidity_gross(100)
                    .build(),
                tick_index: 200,
                tick_current_index: 100,
                liquidity_delta: 42069,
                is_upper_tick: false,
                fee_growth_global_a: 100,
                fee_growth_global_b: 100,
                expected_update: TickUpdate {
                    initialized: true,
                    liquidity_net: 42169,
                    liquidity_gross: 42169,
                    ..Default::default()
                },
                ..Default::default()
            },
            Test {
                name: "upper tick +liquidity already initialized, growths not set, liquidity net should be subtracted",
                tick: TickBuilder::default()
                    .initialized(true)
                    .liquidity_net(100000)
                    .liquidity_gross(100000)
                    .build(),
                tick_index: 200,
                tick_current_index: 100,
                liquidity_delta: 42069,
                is_upper_tick: true,
                expected_update: TickUpdate {
                    initialized: true,
                    liquidity_net:57931,
                    liquidity_gross: 142069,
                    ..Default::default()
                },
                ..Default::default()
            },
            Test {
                name: "upper tick -liquidity, growths not set, uninitialize tick",
                tick: TickBuilder::default()
                    .initialized(true)
                    .liquidity_net(-100000)
                    .liquidity_gross(100000)
                    .build(),
                tick_index: 200,
                tick_current_index: 100,
                liquidity_delta: -100000,
                is_upper_tick: true,
                expected_update: TickUpdate {
                    initialized: false,
                    liquidity_net: 0,
                    liquidity_gross: 0,
                    ..Default::default()
                },
                ..Default::default()
            },
            Test {
                name: "lower tick -liquidity, growths not set, initialized no change",
                tick: TickBuilder::default()
                    .initialized(true)
                    .liquidity_net(100000)
                    .liquidity_gross(200000)
                    .build(),
                tick_index: 200,
                tick_current_index: 100,
                liquidity_delta: -100000,
                is_upper_tick: false,
                expected_update: TickUpdate {
                    initialized: true,
                    liquidity_net: 0,
                    liquidity_gross: 100000,
                    ..Default::default()
                },
                ..Default::default()
            },
            Test {
                name: "liquidity delta zero is no-op",
                tick: TickBuilder::default()
                    .initialized(true)
                    .liquidity_net(100000)
                    .liquidity_gross(200000)
                    .build(),
                tick_index: 200,
                tick_current_index: 100,
                liquidity_delta: 0,
                is_upper_tick: false,
                expected_update: TickUpdate {
                    initialized: true,
                    liquidity_net: 100000,
                    liquidity_gross: 200000,
                    ..Default::default()
                },
                ..Default::default()
            },
        ] {
            // System under test
            let update = next_tick_modify_liquidity_update(
                &test.tick,
                test.tick_index,
                test.tick_current_index,
                test.fee_growth_global_a,
                test.fee_growth_global_b,
                test.liquidity_delta,
                test.is_upper_tick,
            )
            .unwrap();

            assert_eq!(
                update.initialized, test.expected_update.initialized,
                "{}: initialized invalid",
                test.name
            );
            assert_eq!(
                update.liquidity_net, test.expected_update.liquidity_net,
                "{}: liquidity_net invalid",
                test.name
            );
            assert_eq!(
                update.liquidity_gross, test.expected_update.liquidity_gross,
                "{}: liquidity_gross invalid",
                test.name
            );
            assert_eq!(
                update.fee_growth_outside_a, test.expected_update.fee_growth_outside_a,
                "{}: fee_growth_outside_a invalid",
                test.name
            );
            assert_eq!(
                update.fee_growth_outside_b, test.expected_update.fee_growth_outside_b,
                "{}: fee_growth_outside_b invalid",
                test.name
            );
        }
    }

    #[test]
    fn test_next_tick_modify_liquidity_update_errors() {
        struct Test<'a> {
            name: &'a str,
            tick: Tick,
            tick_index: i32,
            tick_current_index: i32,
            liquidity_delta: i128,
            is_upper_tick: bool,
            expected_error: ErrorCode,
        }

        for test in [
            Test {
                name: "liquidity gross overflow",
                tick: TickBuilder::default().liquidity_gross(u128::MAX).build(),
                tick_index: 0,
                tick_current_index: 10,
                liquidity_delta: i128::MAX,
                is_upper_tick: false,
                expected_error: ErrorCode::LiquidityOverflow,
            },
            Test {
                name: "liquidity gross underflow",
                tick: Tick::default(),
                tick_index: 0,
                tick_current_index: 10,
                liquidity_delta: -100,
                is_upper_tick: false,
                expected_error: ErrorCode::LiquidityUnderflow,
            },
            Test {
                name: "liquidity net overflow from subtracting negative delta",
                tick: TickBuilder::default()
                    .liquidity_gross(i128::MAX as u128)
                    .liquidity_net(i128::MAX)
                    .build(),
                tick_index: 0,
                tick_current_index: 10,
                liquidity_delta: -(i128::MAX - 1),
                is_upper_tick: true,
                expected_error: ErrorCode::LiquidityNetError,
            },
            Test {
                name: "liquidity net underflow",
                tick: TickBuilder::default()
                    .liquidity_gross(10000)
                    .liquidity_net(i128::MAX)
                    .build(),
                tick_index: 0,
                tick_current_index: 10,
                liquidity_delta: i128::MAX,
                is_upper_tick: false,
                expected_error: ErrorCode::LiquidityNetError,
            },
        ] {
            // System under test
            let err = next_tick_modify_liquidity_update(
                &test.tick,
                test.tick_index,
                test.tick_current_index,
                0,
                0,
                test.liquidity_delta,
                test.is_upper_tick,
            )
            .unwrap_err();

            assert_eq!(err, test.expected_error, "{}", test.name);
        }
    }

    #[test]
    fn test_next_tick_cross_update() {
        struct Test<'a> {
            name: &'a str,
            tick: Tick,
            fee_growth_global_a: u128,
            fee_growth_global_b: u128,
            expected_update: TickUpdate,
        }

        for test in [Test {
            name: "growths set properly (inverted)",
            tick: TickBuilder::default()
                .fee_growth_outside_a(1000)
                .fee_growth_outside_b(1000)
                .build(),
            fee_growth_global_a: 2500,
            fee_growth_global_b: 6750,
            expected_update: TickUpdate {
                fee_growth_outside_a: 1500,
                fee_growth_outside_b: 5750,
                ..Default::default()
            },
        }] {
            // System under test
            let update = next_tick_cross_update(
                &test.tick,
                test.fee_growth_global_a,
                test.fee_growth_global_b,
            )
            .unwrap();

            assert_eq!(
                update.fee_growth_outside_a, test.expected_update.fee_growth_outside_a,
                "{}: fee_growth_outside_a invalid",
                test.name
            );
            assert_eq!(
                update.fee_growth_outside_b, test.expected_update.fee_growth_outside_b,
                "{}: fee_growth_outside_b invalid",
                test.name
            );
        }
    }
}
