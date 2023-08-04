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
