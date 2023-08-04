use anchor_lang::prelude::*;

pub const CNFT_WEIGHT_RECORD_SIZE: usize = 8;

#[account]
#[derive(Debug)]
pub struct CnftWeightRecord {
    pub weight: u64,
}

impl CnftWeightRecord {
    pub fn new(weight: u64) -> Self {
        Self { weight }
    }

    pub fn get_weight(&self) -> u64 {
        self.weight
    }
}

pub fn get_cnft_weight_record_seeds(nft_mint: &Pubkey) -> [&[u8]; 2] {
    [b"cnft-weight-record", nft_mint.as_ref()]
}

pub fn get_cnft_weight_record_address(nft_mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&get_cnft_weight_record_seeds(nft_mint), &crate::id())
}
