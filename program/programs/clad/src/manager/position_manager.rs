use crate::{
    errors::ErrorCode,
    math::{add_liquidity_delta, checked_mul_shift_right},
    state::{LiquidityPosition, LiquidityPositionUpdate},
};

pub fn next_position_modify_liquidity_update(
    position: &LiquidityPosition,
    liquidity_delta: i128,
    fee_growth_inside_a: u128,
    fee_growth_inside_b: u128,
) -> Result<LiquidityPositionUpdate, ErrorCode> {
    let mut update = LiquidityPositionUpdate::default();

    // Calculate fee deltas.
    // If fee deltas overflow, default to a zero value. This means the position loses
    // all fees earned since the last time the position was modified or fees collected.
    let growth_delta_a = fee_growth_inside_a.wrapping_sub(position.fee_growth_checkpoint_a);
    let fee_delta_a = checked_mul_shift_right(position.liquidity, growth_delta_a).unwrap_or(0);

    let growth_delta_b = fee_growth_inside_b.wrapping_sub(position.fee_growth_checkpoint_b);
    let fee_delta_b = checked_mul_shift_right(position.liquidity, growth_delta_b).unwrap_or(0);

    update.fee_growth_checkpoint_a = fee_growth_inside_a;
    update.fee_growth_checkpoint_b = fee_growth_inside_b;

    // Overflows allowed. Must collect fees owed before overflow.
    update.fee_owed_a = position.fee_owed_a.wrapping_add(fee_delta_a);
    update.fee_owed_b = position.fee_owed_b.wrapping_add(fee_delta_b);

    update.liquidity = add_liquidity_delta(position.liquidity, liquidity_delta)?;

    Ok(update)
}

#[cfg(test)]
mod position_manager_unit_tests {
    use {
        super::next_position_modify_liquidity_update,
        crate::{
            math::Q64_RESOLUTION, state::liquidity_position_builder::LiquidityPositionBuilder,
        },
    };

    #[test]
    fn ok_positive_liquidity_delta_fee_growth() {
        let position = LiquidityPositionBuilder::new(-10, 10)
            .liquidity(0)
            .fee_owed_a(10)
            .fee_owed_b(500)
            .fee_growth_checkpoint_a(100 << Q64_RESOLUTION)
            .fee_growth_checkpoint_b(100 << Q64_RESOLUTION)
            .build();
        let update = next_position_modify_liquidity_update(
            &position,
            1000,
            1000 << Q64_RESOLUTION,
            2000 << Q64_RESOLUTION,
        )
        .unwrap();

        assert_eq!(update.liquidity, 1000);
        assert_eq!(update.fee_growth_checkpoint_a, 1000 << Q64_RESOLUTION);
        assert_eq!(update.fee_growth_checkpoint_b, 2000 << Q64_RESOLUTION);
        assert_eq!(update.fee_owed_a, 10);
        assert_eq!(update.fee_owed_b, 500);
    }

    #[test]
    fn ok_negative_liquidity_delta_fee_growth() {
        let position = LiquidityPositionBuilder::new(-10, 10)
            .liquidity(10000)
            .fee_growth_checkpoint_a(100 << Q64_RESOLUTION)
            .fee_growth_checkpoint_b(100 << Q64_RESOLUTION)
            .build();
        let update = next_position_modify_liquidity_update(
            &position,
            -5000,
            120 << Q64_RESOLUTION,
            250 << Q64_RESOLUTION,
        )
        .unwrap();

        assert_eq!(update.liquidity, 5000);
        assert_eq!(update.fee_growth_checkpoint_a, 120 << Q64_RESOLUTION);
        assert_eq!(update.fee_growth_checkpoint_b, 250 << Q64_RESOLUTION);
        assert_eq!(update.fee_owed_a, 200_000);
        assert_eq!(update.fee_owed_b, 1500_000);
    }

    #[test]
    #[should_panic(expected = "LiquidityUnderflow")]
    fn liquidity_underflow() {
        let position = LiquidityPositionBuilder::new(-10, 10).build();
        next_position_modify_liquidity_update(&position, -100, 0, 0).unwrap();
    }

    #[test]
    #[should_panic(expected = "LiquidityOverflow")]
    fn liquidity_overflow() {
        let position = LiquidityPositionBuilder::new(-10, 10)
            .liquidity(u128::MAX)
            .build();
        next_position_modify_liquidity_update(&position, i128::MAX, 0, 0).unwrap();
    }

    #[test]
    fn fee_delta_overflow_defaults_zero() {
        let position = LiquidityPositionBuilder::new(-10, 10)
            .liquidity(i64::MAX as u128)
            .fee_owed_a(10)
            .fee_owed_b(20)
            .build();
        let update = next_position_modify_liquidity_update(
            &position,
            i64::MAX as i128,
            u128::MAX,
            u128::MAX,
        )
        .unwrap();
        assert_eq!(update.fee_growth_checkpoint_a, u128::MAX);
        assert_eq!(update.fee_growth_checkpoint_b, u128::MAX);
        assert_eq!(update.fee_owed_a, 10);
        assert_eq!(update.fee_owed_b, 20);
    }
}
