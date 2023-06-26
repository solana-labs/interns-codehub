use crate::id;
use anchor_lang::prelude::*;
use crate::utils::constant::DISCRIMINATOR_SIZE;
use solana_program::pubkey::PUBKEY_BYTES;


#[account]
#[derive(Debug, PartialEq)]
pub struct MaxVoterWeightRecord {
    pub realm: Pubkey,
    pub governing_token_mint: Pubkey,

    pub max_voter_weight: u64,
    pub max_voter_weight_expiry: Option<u64>,

    pub reserved: [u8; 8],
}

impl MaxVoterWeightRecord {
    pub fn get_space() -> usize {
        DISCRIMINATOR_SIZE + PUBKEY_BYTES * 2 + 8 + 1 + 8
    }
}

impl Default for MaxVoterWeightRecord {
    fn default() -> Self {
        Self {
            realm: Default::default(),
            governing_token_mint: Default::default(),
            max_voter_weight: Default::default(),
            max_voter_weight_expiry: Some(0),
            reserved: Default::default(),
        }
    }
}

pub fn get_max_voter_weight_record_address(realm: &Pubkey, governing_token_mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            b"max-voter-weight-record",
            realm.as_ref(),
            governing_token_mint.as_ref(),
        ],
        &id(),
    ).0
}
