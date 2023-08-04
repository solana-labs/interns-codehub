use anchor_lang::prelude::*;
use crate::utils::constant::DISCRIMINATOR_SIZE;
use borsh::{ BorshDeserialize, BorshSchema, BorshSerialize };
use solana_program::program_pack::IsInitialized;
use spl_governance_tools::account::{ get_account_data, AccountMaxSize };

pub const CNFT_WEIGHT_RECORD_SIZE: usize = DISCRIMINATOR_SIZE + 32 + 8;

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct CnftWeightRecord {
    pub account_discriminator: [u8; 8],
    pub nft_owner: Pubkey,
    pub weight: u64,
}

impl CnftWeightRecord {
    pub fn new(nft_owner: Pubkey, weight: u64) -> Self {
        Self {
            account_discriminator: CnftWeightRecord::ACCOUNT_DISCRIMINATOR,
            nft_owner: nft_owner,
            weight,
        }
    }

    pub fn get_weight(&self) -> u64 {
        self.weight
    }
}

impl CnftWeightRecord {
    /// sha256("account:CnftWeightRecord")
    /// python:
    /// from hashlib import sha256
    /// list(sha256("account:CnftWeightRecord".encode()).digest())[:8]
    pub const ACCOUNT_DISCRIMINATOR: [u8; 8] = [134, 202, 196, 221, 187, 111, 152, 79];
}

impl AccountMaxSize for CnftWeightRecord {}

impl IsInitialized for CnftWeightRecord {
    fn is_initialized(&self) -> bool {
        self.account_discriminator == CnftWeightRecord::ACCOUNT_DISCRIMINATOR
    }
}

pub fn get_cnft_weight_record_seeds(nft_mint: &Pubkey) -> [&[u8]; 2] {
    [b"cnft-weight-record", nft_mint.as_ref()]
}

pub fn get_cnft_weight_record_address(nft_mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&get_cnft_weight_record_seeds(nft_mint), &crate::id())
}

pub fn get_cnft_weight_record_data(
    cnft_weight_record_info: &AccountInfo
) -> Result<CnftWeightRecord> {
    Ok(get_account_data::<CnftWeightRecord>(&crate::id(), cnft_weight_record_info)?)
}
