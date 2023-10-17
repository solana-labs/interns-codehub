use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{pubkey::Pubkey};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ProfileHeader {
    pub recovery_threshold: u8,
    pub guardians: Vec<Pubkey>,
}