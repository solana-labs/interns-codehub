use anchor_lang::prelude::*;

pub fn get_asset_id(tree_id: &Pubkey, nft_mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"governance_metadata".as_ref(), tree_id.as_ref(), nft_mint.as_ref()],
        &crate::id()
    ).0
}
