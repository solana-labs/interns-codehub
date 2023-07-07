use anchor_lang::prelude::*;

use crate::errors::ErrorCode;

use super::{Tick, Globalpool};

#[account]
#[derive(Default)]
pub struct LiquidityPosition {
    pub globalpool: Pubkey,     // 32
    pub position_mint: Pubkey, // 32
    pub liquidity: u128,       // 16
    pub tick_lower_index: i32, // 4
    pub tick_upper_index: i32, // 4

    // Q64.64
    pub fee_growth_checkpoint_a: u128, // 16
    pub fee_owed_a: u64,               // 8
    // Q64.64
    pub fee_growth_checkpoint_b: u128, // 16
    pub fee_owed_b: u64,               // 8
}

impl LiquidityPosition {
    pub const LEN: usize = 8 + std::mem::size_of::<LiquidityPosition>();

    pub fn is_position_empty<'info>(position: &LiquidityPosition) -> bool {
        let fees_not_owed = position.fee_owed_a == 0 && position.fee_owed_b == 0;
        position.liquidity == 0 && fees_not_owed
    }

    pub fn update(&mut self, update: &LiquidityPositionUpdate) {
        self.liquidity = update.liquidity;
        self.fee_growth_checkpoint_a = update.fee_growth_checkpoint_a;
        self.fee_growth_checkpoint_b = update.fee_growth_checkpoint_b;
        self.fee_owed_a = update.fee_owed_a;
        self.fee_owed_b = update.fee_owed_b;
    }

    pub fn open_position(
        &mut self,
        globalpool: &Account<Globalpool>,
        position_mint: Pubkey,
        tick_lower_index: i32,
        tick_upper_index: i32,
    ) -> Result<()> {
        if !Tick::check_is_usable_tick(tick_lower_index, globalpool.tick_spacing)
            || !Tick::check_is_usable_tick(tick_upper_index, globalpool.tick_spacing)
            || tick_lower_index >= tick_upper_index
        {
            return Err(ErrorCode::InvalidTickIndex.into());
        }

        self.globalpool = globalpool.key();
        self.position_mint = position_mint;

        self.tick_lower_index = tick_lower_index;
        self.tick_upper_index = tick_upper_index;
        Ok(())
    }

    pub fn reset_fees_owed(&mut self) {
        self.fee_owed_a = 0;
        self.fee_owed_b = 0;
    }
}

#[derive(Default, Debug, PartialEq)]
pub struct LiquidityPositionUpdate {
    pub liquidity: u128,
    pub fee_growth_checkpoint_a: u128,
    pub fee_owed_a: u64,
    pub fee_growth_checkpoint_b: u128,
    pub fee_owed_b: u64,
}

#[cfg(test)]
mod is_liquidity_position_empty_tests {
    use super::*;

    pub fn build_test_position(
        liquidity: u128,
        fee_owed_a: u64,
        fee_owed_b: u64,
    ) -> Position {
        LiquidityPosition {
            globalpool: Pubkey::default(),
            position_mint: Pubkey::default(),
            liquidity,
            tick_lower_index: 0,
            tick_upper_index: 0,
            fee_growth_checkpoint_a: 0,
            fee_owed_a,
            fee_growth_checkpoint_b: 0,
            fee_owed_b,
        }
    }

    #[test]
    fn test_position_empty() {
        let pos = build_test_position(0, 0, 0);
        assert_eq!(LiquidityPosition::is_position_empty(&pos), true);
    }

    #[test]
    fn test_liquidity_non_zero() {
        let pos = build_test_position(100, 0, 0);
        assert_eq!(LiquidityPosition::is_position_empty(&pos), false);
    }

    #[test]
    fn test_fee_a_non_zero() {
        let pos = build_test_position(0, 100, 0);
        assert_eq!(LiquidityPosition::is_position_empty(&pos), false);
    }

    #[test]
    fn test_fee_b_non_zero() {
        let pos = build_test_position(0, 0, 100);
        assert_eq!(LiquidityPosition::is_position_empty(&pos), false);
    }
}

#[cfg(test)]
pub mod liquidity_position_builder {
    use anchor_lang::prelude::Pubkey;

    use super::LiquidityPosition;

    #[derive(Default)]
    pub struct LiquidityPositionBuilder {
        liquidity: u128,

        tick_lower_index: i32,
        tick_upper_index: i32,

        // Q64.64
        fee_growth_checkpoint_a: u128,
        fee_owed_a: u64,
        // Q64.64
        fee_growth_checkpoint_b: u128,
        fee_owed_b: u64,
    }

    impl LiquidityPositionBuilder {
        pub fn new(tick_lower_index: i32, tick_upper_index: i32) -> Self {
            Self {
                tick_lower_index,
                tick_upper_index,
                ..Default::default()
            }
        }

        pub fn liquidity(mut self, liquidity: u128) -> Self {
            self.liquidity = liquidity;
            self
        }

        pub fn fee_growth_checkpoint_a(mut self, fee_growth_checkpoint_a: u128) -> Self {
            self.fee_growth_checkpoint_a = fee_growth_checkpoint_a;
            self
        }

        pub fn fee_growth_checkpoint_b(mut self, fee_growth_checkpoint_b: u128) -> Self {
            self.fee_growth_checkpoint_b = fee_growth_checkpoint_b;
            self
        }

        pub fn fee_owed_a(mut self, fee_owed_a: u64) -> Self {
            self.fee_owed_a = fee_owed_a;
            self
        }

        pub fn fee_owed_b(mut self, fee_owed_b: u64) -> Self {
            self.fee_owed_b = fee_owed_b;
            self
        }

        pub fn build(self) -> LiquidityPosition {
            LiquidityPosition {
                globalpool: Pubkey::new_unique(),
                position_mint: Pubkey::new_unique(),
                liquidity: self.liquidity,
                fee_growth_checkpoint_a: self.fee_growth_checkpoint_a,
                fee_growth_checkpoint_b: self.fee_growth_checkpoint_b,
                fee_owed_a: self.fee_owed_a,
                fee_owed_b: self.fee_owed_b,
                tick_lower_index: self.tick_lower_index,
                tick_upper_index: self.tick_upper_index,
                ..Default::default()
            }
        }
    }
}
