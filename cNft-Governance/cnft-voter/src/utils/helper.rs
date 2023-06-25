use anchor_lang::prelude::*;
use mpl_bubblegum::state::leaf_schema::LeafSchema;
use spl_account_compression::cpi::accounts::VerifyLeaf;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyParams {
    pub root: [u8; 32],
    pub data_hash: [u8; 32],
    pub creator_hash: [u8; 32],
    pub nonce: u64,
    pub index: u32,
}

pub fn verify_cnft<'info>(
    merkle_tree: &AccountInfo<'info>,
    id: &Pubkey,
    leaf_owner: &Pubkey,
    leaf_delegate: &Pubkey,
    params: &VerifyParams,
    proofs: Vec<AccountInfo<'info>>,
    compression_program: &AccountInfo<'info>,
) -> Result<()> {
    let leaf = LeafSchema::new_v0(
        *id,
        *leaf_owner,
        *leaf_delegate,
        params.nonce,
        params.data_hash,
        params.creator_hash,
    );

    let cpi_ctx = CpiContext::new(
        compression_program.clone(),
        VerifyLeaf {
            merkle_tree: merkle_tree.clone(),
        },
    )
    .with_remaining_accounts(proofs);

    spl_account_compression::cpi::verify_leaf(cpi_ctx, params.root, leaf.to_node(), params.index)?;

    Ok(())
}
