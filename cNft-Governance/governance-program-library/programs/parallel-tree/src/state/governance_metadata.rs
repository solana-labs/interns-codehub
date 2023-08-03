use anchor_lang::prelude::*;
use solana_program::pubkey::Pubkey;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Realm {
    pub key: Pubkey,
    pub verified: bool,
}

// probably need it for further verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CompressedNft {
    pub asset_id: Pubkey,
    pub data_hash: [u8; 32],
    pub creator_hash: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct GovernanceMetadata {
    pub realm: Realm,
    pub owner: Pubkey,
    pub compressed_nft: Pubkey, // CompressedNft
    pub governance_weight: u32,
}
