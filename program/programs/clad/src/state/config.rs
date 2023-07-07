use anchor_lang::prelude::*;

use crate::{errors::ErrorCode, math::MAX_PROTOCOL_FEE_RATE};

#[account]
pub struct GlobalpoolsConfig {
    pub fee_authority: Pubkey,
    pub collect_protocol_fees_authority: Pubkey,
    // Default protocol fee rate imposed on pools using this config. Each pool can configure the protocol fee, but uses this rate if untouched.
    pub default_protocol_fee_rate: u16,
}

impl GlobalpoolsConfig {
    pub const LEN: usize = 8 + 96 + 4;

    pub fn update_fee_authority(&mut self, fee_authority: Pubkey) {
        self.fee_authority = fee_authority;
    }

    pub fn update_collect_protocol_fees_authority(
        &mut self,
        collect_protocol_fees_authority: Pubkey,
    ) {
        self.collect_protocol_fees_authority = collect_protocol_fees_authority;
    }

    pub fn initialize(
        &mut self,
        fee_authority: Pubkey,
        collect_protocol_fees_authority: Pubkey,
        default_protocol_fee_rate: u16,
    ) -> Result<()> {
        self.fee_authority = fee_authority;
        self.collect_protocol_fees_authority = collect_protocol_fees_authority;
        self.update_default_protocol_fee_rate(default_protocol_fee_rate)?;

        Ok(())
    }

    pub fn update_default_protocol_fee_rate(
        &mut self,
        default_protocol_fee_rate: u16,
    ) -> Result<()> {
        if default_protocol_fee_rate > MAX_PROTOCOL_FEE_RATE {
            return Err(ErrorCode::ProtocolFeeRateMaxExceeded.into());
        }
        self.default_protocol_fee_rate = default_protocol_fee_rate;

        Ok(())
    }
}
