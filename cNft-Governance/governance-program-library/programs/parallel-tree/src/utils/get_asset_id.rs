use anchor_lang::prelude::*;

pub fn get_parallel_asset_id(tree_id: &Pubkey, asset_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"governance_metadata".as_ref(), tree_id.as_ref(), asset_id.as_ref()],
        &crate::id()
    ).0
}
