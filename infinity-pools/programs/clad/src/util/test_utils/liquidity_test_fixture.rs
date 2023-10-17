use crate::{
    manager::{liquidity_manager::ModifyLiquidityUpdate, tick_manager::next_tick_cross_update},
    math::{add_liquidity_delta, Q64_RESOLUTION},
    state::{
        globalpool_builder::GlobalpoolBuilder,
        liquidity_position_builder::LiquidityPositionBuilder, tick::*, tick_builder::TickBuilder,
        Globalpool, LiquidityPosition, LiquidityPositionUpdate,
    },
};

const BELOW_LOWER_TICK_INDEX: i32 = -120;
const ABOVE_UPPER_TICK_INDEX: i32 = 120;

pub enum CurrIndex {
    Below,
    Inside,
    Above,
}

pub enum TickLabel {
    Upper,
    Lower,
}

pub enum Direction {
    Left,
    Right,
}

// State for testing modifying liquidity in a single globalpool position
pub struct LiquidityTestFixture {
    pub globalpool: Globalpool,
    pub position: LiquidityPosition,
    pub tick_lower: Tick,
    pub tick_upper: Tick,
}

pub struct LiquidityTestFixtureInfo {
    pub curr_index_loc: CurrIndex,
    pub globalpool_liquidity: u128,
    pub position_liquidity: u128,
    pub tick_lower_liquidity_gross: u128,
    pub tick_upper_liquidity_gross: u128,
    pub fee_growth_global_a: u128,
    pub fee_growth_global_b: u128,
}

impl LiquidityTestFixture {
    pub fn new(info: LiquidityTestFixtureInfo) -> LiquidityTestFixture {
        assert!(info.tick_lower_liquidity_gross < i64::MAX as u128);
        assert!(info.tick_upper_liquidity_gross < i64::MAX as u128);

        // Tick's must have enough at least enough liquidity to support the position
        assert!(info.tick_lower_liquidity_gross >= info.position_liquidity);
        assert!(info.tick_upper_liquidity_gross >= info.position_liquidity);

        let curr_index = match info.curr_index_loc {
            CurrIndex::Below => BELOW_LOWER_TICK_INDEX,
            CurrIndex::Inside => 0,
            CurrIndex::Above => ABOVE_UPPER_TICK_INDEX,
        };

        let globalpool = GlobalpoolBuilder::new()
            .tick_current_index(curr_index)
            .liquidity(info.globalpool_liquidity)
            .fee_growth_global_a(info.fee_growth_global_a)
            .fee_growth_global_b(info.fee_growth_global_b)
            .build();

        let tick_lower_initialized = info.tick_lower_liquidity_gross > 0;
        let tick_upper_initialized = info.tick_upper_liquidity_gross > 0;

        LiquidityTestFixture {
            globalpool,
            position: LiquidityPositionBuilder::new(-100, 100)
                .liquidity(info.position_liquidity)
                .build(),
            tick_lower: TickBuilder::default()
                .initialized(tick_lower_initialized)
                .liquidity_gross(info.tick_lower_liquidity_gross)
                .liquidity_net(info.tick_lower_liquidity_gross as i128)
                .build(),
            tick_upper: TickBuilder::default()
                .initialized(tick_upper_initialized)
                .liquidity_gross(info.tick_upper_liquidity_gross)
                .liquidity_net(-(info.tick_upper_liquidity_gross as i128))
                .build(),
        }
    }

    pub fn increment_globalpool_fee_growths(
        &mut self,
        fee_growth_delta_a: u128,
        fee_growth_delta_b: u128,
    ) {
        self.globalpool.fee_growth_global_a = self
            .globalpool
            .fee_growth_global_a
            .wrapping_add(fee_growth_delta_a);
        self.globalpool.fee_growth_global_b = self
            .globalpool
            .fee_growth_global_b
            .wrapping_add(fee_growth_delta_b);
    }

    /// Simulates crossing a tick within the test fixture.
    pub fn cross_tick(&mut self, tick_label: TickLabel, direction: Direction) {
        let tick = match tick_label {
            TickLabel::Lower => &mut self.tick_lower,
            TickLabel::Upper => &mut self.tick_upper,
        };
        let update = next_tick_cross_update(
            tick,
            self.globalpool.fee_growth_global_a,
            self.globalpool.fee_growth_global_b,
        )
        .unwrap();

        tick.update(&update);

        self.globalpool.liquidity_available = add_liquidity_delta(
            self.globalpool.liquidity_available,
            match direction {
                Direction::Left => -tick.liquidity_net,
                Direction::Right => tick.liquidity_net,
            },
        )
        .unwrap();

        match tick_label {
            TickLabel::Lower => match direction {
                Direction::Right => self.globalpool.tick_current_index = 0,
                Direction::Left => self.globalpool.tick_current_index = BELOW_LOWER_TICK_INDEX,
            },
            TickLabel::Upper => match direction {
                Direction::Left => self.globalpool.tick_current_index = 0,
                Direction::Right => self.globalpool.tick_current_index = ABOVE_UPPER_TICK_INDEX,
            },
        }
    }

    pub fn apply_update(&mut self, update: &ModifyLiquidityUpdate) {
        self.globalpool.liquidity_available = update.globalpool_liquidity;
        self.tick_lower.update(&update.tick_lower_update);
        self.tick_upper.update(&update.tick_upper_update);
        self.position.update(&update.position_update);
    }
}

pub fn to_x64(n: u128) -> u128 {
    n << Q64_RESOLUTION
}

pub struct ModifyLiquidityExpectation {
    pub globalpool_liquidity: u128,
    pub position_update: LiquidityPositionUpdate,
    pub tick_lower_update: TickUpdate,
    pub tick_upper_update: TickUpdate,
}

pub fn assert_modify_liquidity(
    update: &ModifyLiquidityUpdate,
    expect: &ModifyLiquidityExpectation,
) {
    assert_eq!(update.globalpool_liquidity, expect.globalpool_liquidity);
    assert_eq!(update.tick_lower_update, expect.tick_lower_update);
    assert_eq!(update.tick_upper_update, expect.tick_upper_update);
    assert_eq!(update.position_update, expect.position_update);
}
