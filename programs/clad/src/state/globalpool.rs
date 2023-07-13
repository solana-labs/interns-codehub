use {
    crate::{
        errors::ErrorCode,
        math::{
            tick_index_from_sqrt_price, MAX_FEE_RATE, MAX_PROTOCOL_FEE_RATE, MAX_SQRT_PRICE_X64,
            MIN_SQRT_PRICE_X64,
        },
        util::to_timestamp_u64,
    },
    anchor_lang::prelude::*,
};

#[account]
#[derive(Default)]
pub struct Globalpool {
    pub bump: [u8; 1], // Globalpool bump

    pub tick_spacing: u16,         
    pub tick_spacing_seed: [u8; 2],

    // Stored as hundredths of a basis point
    // u16::MAX corresponds to ~6.5%
    pub fee_rate: u16,
    pub fee_rate_seed: [u8; 2],

    // Portion of fee rate taken stored as basis points
    pub protocol_fee_rate: u16,

    // liquidity: u128 Maximum amount that can be held by Solana account

    //
    pub liquidity_available: u128,

    // Liquidity of Token A on loan
    pub liquidity_borrowed_a: u128,

    // Liquidity of Token B on loan
    pub liquidity_borrowed_b: u128,

    // Liquidity of Token A swapped from Token B for trade positions (for ledger purposes)
    pub liquidity_trade_locked_a: u128,

    // Liquidity of Token B swapped from Token A for trade positions (for ledger purposes)
    pub liquidity_trade_locked_b: u128,

    // MAX/MIN at Q32.64, but using Q64.64 for rounder bytes
    // Q64.64
    pub sqrt_price: u128,        // 16
    pub tick_current_index: i32, // 4

    pub protocol_fee_owed_a: u64, // 8
    pub protocol_fee_owed_b: u64, // 8

    pub token_mint_a: Pubkey,  // 32
    pub token_vault_a: Pubkey, // 32

    // Q64.64
    pub fee_growth_global_a: u128, // 16

    pub token_mint_b: Pubkey,  // 32
    pub token_vault_b: Pubkey, // 32

    // Q64.64
    pub fee_growth_global_b: u128, // 16

    // time of inception, also used as current wall clock time for testing
    pub inception_time: u64,

    pub fee_authority: Pubkey,
}

impl Globalpool {
    pub const LEN: usize = 8 + std::mem::size_of::<Globalpool>() + 384;
    pub fn seeds<'a>(&self) -> [&[u8]; 6] {
        [
            &b"globalpool"[..],
            self.token_mint_a.as_ref(),
            self.token_mint_b.as_ref(),
            self.fee_rate_seed.as_ref(),
            self.tick_spacing_seed.as_ref(),
            self.bump.as_ref(),
        ]
    }

    pub fn initialize(
        &mut self,
        globalpool_bump: u8,
        tick_spacing: u16,
        sqrt_price: u128,
        fee_rate: u16,
        protocol_fee_rate: u16,
        fee_authority: Pubkey,
        token_mint_a: Pubkey,
        token_vault_a: Pubkey,
        token_mint_b: Pubkey,
        token_vault_b: Pubkey,
    ) -> Result<()> {
        if token_mint_a.ge(&token_mint_b) {
            return Err(ErrorCode::InvalidTokenMintOrder.into());
        }

        if sqrt_price < MIN_SQRT_PRICE_X64 || sqrt_price > MAX_SQRT_PRICE_X64 {
            return Err(ErrorCode::SqrtPriceOutOfBounds.into());
        }

        if self.inception_time != 0 || self.sqrt_price != 0 {
            return Err(ProgramError::AccountAlreadyInitialized.into());
        }

        self.bump = [globalpool_bump];

        self.tick_spacing = tick_spacing;
        self.tick_spacing_seed = self.tick_spacing.to_le_bytes();

        if fee_rate > MAX_FEE_RATE {
            return Err(ErrorCode::FeeRateMaxExceeded.into());
        }
        self.fee_rate = fee_rate;
        self.fee_rate_seed = self.fee_rate.to_le_bytes();

        if protocol_fee_rate > MAX_PROTOCOL_FEE_RATE {
            return Err(ErrorCode::ProtocolFeeRateMaxExceeded.into());
        }
        self.protocol_fee_rate = protocol_fee_rate;

        self.liquidity_available = 0;
        self.liquidity_borrowed_a = 0;
        self.liquidity_borrowed_b = 0;
        self.liquidity_trade_locked_a = 0;
        self.liquidity_trade_locked_b = 0;

        self.sqrt_price = sqrt_price;
        self.tick_current_index = tick_index_from_sqrt_price(&sqrt_price);

        self.protocol_fee_owed_a = 0;
        self.protocol_fee_owed_b = 0;

        self.token_mint_a = token_mint_a;
        self.token_vault_a = token_vault_a;
        self.fee_growth_global_a = 0;
        self.fee_authority = fee_authority;

        self.token_mint_b = token_mint_b;
        self.token_vault_b = token_vault_b;
        self.fee_growth_global_b = 0;

        self.inception_time = to_timestamp_u64(Clock::get()?.unix_timestamp)?;

        Ok(())
    }

    pub fn update_liquidity(&mut self, liquidity: u128) {
        self.liquidity_available = liquidity;
    }

    pub fn update_after_swap(
        &mut self,
        liquidity_available: u128,
        tick_index: i32,
        sqrt_price: u128,
        fee_growth_global: u128,
        protocol_fee: u64,
        is_token_fee_in_a: bool,
    ) {
        self.tick_current_index = tick_index;
        self.sqrt_price = sqrt_price;
        self.liquidity_available = liquidity_available;
        if is_token_fee_in_a {
            // Add fees taken via a
            self.fee_growth_global_a = fee_growth_global;
            self.protocol_fee_owed_a += protocol_fee;
        } else {
            // Add fees taken via b
            self.fee_growth_global_b = fee_growth_global;
            self.protocol_fee_owed_b += protocol_fee;
        }
    }

    pub fn update_after_borrow(
        &mut self,
        liquidity_borrowed: u128,
        tick_index: i32,
        sqrt_price: u128,
    ) {
        todo!()
    }

    pub fn reset_protocol_fees_owed(&mut self) {
        self.protocol_fee_owed_a = 0;
        self.protocol_fee_owed_b = 0;
    }
}

#[cfg(test)]
pub mod globalpool_builder {
    use super::Globalpool;

    #[derive(Default)]
    pub struct GlobalpoolBuilder {
        liquidity: u128,
        tick_spacing: u16,
        tick_current_index: i32,
        sqrt_price: u128,
        fee_rate: u16,
        protocol_fee_rate: u16,
        fee_growth_global_a: u128,
        fee_growth_global_b: u128,
    }

    impl GlobalpoolBuilder {
        pub fn new() -> Self {
            Default::default()
        }

        pub fn liquidity(mut self, liquidity: u128) -> Self {
            self.liquidity = liquidity;
            self
        }

        pub fn tick_spacing(mut self, tick_spacing: u16) -> Self {
            self.tick_spacing = tick_spacing;
            self
        }

        pub fn tick_current_index(mut self, tick_current_index: i32) -> Self {
            self.tick_current_index = tick_current_index;
            self
        }

        pub fn sqrt_price(mut self, sqrt_price: u128) -> Self {
            self.sqrt_price = sqrt_price;
            self
        }

        pub fn fee_growth_global_a(mut self, fee_growth_global_a: u128) -> Self {
            self.fee_growth_global_a = fee_growth_global_a;
            self
        }

        pub fn fee_growth_global_b(mut self, fee_growth_global_b: u128) -> Self {
            self.fee_growth_global_b = fee_growth_global_b;
            self
        }

        pub fn fee_rate(mut self, fee_rate: u16) -> Self {
            self.fee_rate = fee_rate;
            self
        }

        pub fn protocol_fee_rate(mut self, protocol_fee_rate: u16) -> Self {
            self.protocol_fee_rate = protocol_fee_rate;
            self
        }

        pub fn build(self) -> Globalpool {
            Globalpool {
                liquidity_available: self.liquidity,
                tick_current_index: self.tick_current_index,
                sqrt_price: self.sqrt_price,
                tick_spacing: self.tick_spacing,
                fee_growth_global_a: self.fee_growth_global_a,
                fee_growth_global_b: self.fee_growth_global_b,
                fee_rate: self.fee_rate,
                protocol_fee_rate: self.protocol_fee_rate,
                ..Default::default()
            }
        }
    }
}
