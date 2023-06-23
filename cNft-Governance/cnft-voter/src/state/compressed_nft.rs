use anchor_lang::prelude::*;
use mpl_bubblegum::state::leaf_schema::LeafSchema;
use mpl_bubblegum::state::metaplex_adapter::MetadataArgs;
use mpl_bubblegum::utils::get_asset_id;
use spl_account_compression::{
    program::SplAccountCompression
};
use crate::state::*;

pub struct CompressedNftMetadata<'info> {
    pub nonce: u32,
    pub asset_id: Pubkey,
    pub tree_mint: Pubkey,
    pub tree_root: Pubkey,
    pub leaf_owner: Signer<'info>,
    pub leaf_delegare: AccountInfo<'info>,
    pub proof: Vec<AccountInfo<'info>>,

}


pub fn verify_cnft<'info>(
    proof: &[AccountInfo<'info>]
) {

}

pub fn resolve_cnft_voter_weight(
    registrar: &Registrar,
    governing_token_owner: &Pubkey,
    nft_info: &AccountInfo,
    nft_metadata_info: &AccountInfo,
    unique_nft_asset_ids: &mut Vec<Pubkey>,
) {

}
