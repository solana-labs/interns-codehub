use anchor_lang::prelude::*;
use solana_program::pubkey::Pubkey;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub struct Realm {
    key: Pubkey,
    verified: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub struct GovernanceMetadata {
    pub realm: Realm,
    pub owner: Pubkey,
    pub nft_mint: Pubkey,
    pub governance_weight: u32,
}
