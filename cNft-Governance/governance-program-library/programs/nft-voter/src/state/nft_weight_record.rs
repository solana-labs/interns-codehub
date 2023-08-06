use anchor_lang::prelude::*;
use crate::tools::anchor::DISCRIMINATOR_SIZE;
use borsh::{ BorshDeserialize, BorshSchema, BorshSerialize };
use solana_program::program_pack::IsInitialized;
use spl_governance_tools::account::{ get_account_data, AccountMaxSize };

pub const NFT_WEIGHT_RECORD_SIZE: usize = DISCRIMINATOR_SIZE + 32 + 8;

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct NftWeightRecord {
    pub account_discriminator: [u8; 8],
    pub nft_owner: Pubkey,
    pub weight: u64,
}

impl NftWeightRecord {
    pub fn new(nft_owner: Pubkey, weight: u64) -> Self {
        Self {
            account_discriminator: NftWeightRecord::ACCOUNT_DISCRIMINATOR,
            nft_owner: nft_owner,
            weight,
        }
    }

    pub fn get_weight(&self) -> u64 {
        self.weight
    }
}

impl NftWeightRecord {
    /// sha256("account:NftWeightRecord")
    /// python:
    /// from hashlib import sha256
    /// list(sha256("account:NftWeightRecord".encode()).digest())[:8]
    pub const ACCOUNT_DISCRIMINATOR: [u8; 8] = [246, 204, 35, 97, 148, 254, 19, 228];
}

impl AccountMaxSize for NftWeightRecord {}

impl IsInitialized for NftWeightRecord {
    fn is_initialized(&self) -> bool {
        self.account_discriminator == NftWeightRecord::ACCOUNT_DISCRIMINATOR
    }
}

pub fn get_nft_weight_record_seeds<'a>(owner: &'a Pubkey, nft_mint: &'a Pubkey) -> [&'a [u8]; 3] {
    [b"nft-weight-record", owner.as_ref(), nft_mint.as_ref()]
}

pub fn get_nft_weight_record_address(owner: &Pubkey, nft_mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&get_nft_weight_record_seeds(owner, nft_mint), &crate::id())
}

pub fn get_nft_weight_record_data(nft_weight_record_info: &AccountInfo) -> Result<NftWeightRecord> {
    Ok(get_account_data::<NftWeightRecord>(&crate::id(), nft_weight_record_info)?)
}
