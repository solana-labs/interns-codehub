use {
    crate::{errors::ErrorCode, math::MAX_PROTOCOL_FEE_RATE},
    anchor_lang::prelude::*,
};

#[derive(Copy, Clone, PartialEq, AnchorSerialize, AnchorDeserialize, Debug)]
pub struct Permissions {
    pub allow_swap: bool,
    pub allow_add_liquidity: bool,
    pub allow_remove_liquidity: bool,
    pub allow_open_position: bool,
    pub allow_close_position: bool,
    // pub allow_pnl_withdrawal: bool,
    // pub allow_collateral_withdrawal: bool,
    // pub allow_size_change: bool,
}

impl Default for Permissions {
    #[inline]
    fn default() -> Permissions {
        Permissions {
            allow_swap: true,
            allow_add_liquidity: true,
            allow_remove_liquidity: true,
            allow_open_position: true,
            allow_close_position: true,
            // allow_pnl_withdrawal: true,
            // allow_collateral_withdrawal: true,
        }
    }
}

#[account]
#[derive(Default, Debug)]
pub struct Clad {
    pub permissions: Permissions,

    pub protocol_fee_rate: u16,

    pub clad_bump: u8,
}

impl Clad {
    pub const LEN: usize = 8 + std::mem::size_of::<Clad>();

    pub const BPS_DECIMALS: u8 = 4;
    pub const BPS_POWER: u128 = 10u64.pow(Self::BPS_DECIMALS as u32) as u128;
    pub const PRICE_DECIMALS: u8 = 6;
    pub const USD_DECIMALS: u8 = 6;
    pub const LP_DECIMALS: u8 = Self::USD_DECIMALS;
    pub const RATE_DECIMALS: u8 = 9;
    pub const RATE_POWER: u128 = 10u64.pow(Self::RATE_DECIMALS as u32) as u128;

    pub fn initialize(
        &mut self,
        permissions: Permissions,
        protocol_fee_rate: u16,
        clad_bump: u8,
    ) -> Result<()> {
        self.permissions = permissions;
        self.clad_bump = clad_bump;

        self.update_protocol_fee_rate(protocol_fee_rate);

        Ok(())
    }

    pub fn update_protocol_fee_rate(&mut self, protocol_fee_rate: u16) -> Result<()> {
        if protocol_fee_rate > MAX_PROTOCOL_FEE_RATE {
            return Err(ErrorCode::ProtocolFeeRateMaxExceeded.into());
        }
        self.protocol_fee_rate = protocol_fee_rate;

        Ok(())
    }
}
