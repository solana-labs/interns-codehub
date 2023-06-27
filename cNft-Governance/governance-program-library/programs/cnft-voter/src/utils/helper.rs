use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;
use mpl_bubblegum::state::leaf_schema::LeafSchema;
use mpl_bubblegum::state::metaplex_adapter::MetadataArgs;
use spl_account_compression::cpi::accounts::VerifyLeaf;

use crate::error::CompressedNftVoterError;

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
    asset_id: &Pubkey,
    leaf_owner: &Pubkey,
    leaf_delegate: &Pubkey,
    params: &VerifyParams,
    proofs: Vec<AccountInfo<'info>>,
    compression_program: &AccountInfo<'info>,
) -> Result<()> {
    let leaf = LeafSchema::new_v0(
        *asset_id,
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyParams2 {
    pub root: [u8; 32],
    pub metadata: MetadataArgs,
    pub data_hash: [u8; 32],
    pub creator_hash: [u8; 32],
    pub nonce: u64,
    pub index: u32,
}

pub fn verify_cnft2<'info>(
    merkle_tree: &AccountInfo<'info>,
    asset_id: &Pubkey,
    leaf_owner: &Pubkey,
    leaf_delegate: &Pubkey,
    params: &VerifyParams2,
    proofs: Vec<AccountInfo<'info>>,
    compression_program: &AccountInfo<'info>,
) -> Result<()> {
    let metadata = params.metadata.clone();

    let metadata_args_hash = keccak::hashv(&[metadata.try_to_vec()?.as_slice()]);
    let data_hash = keccak::hashv(&[
        &metadata_args_hash.to_bytes(),
        &metadata.seller_fee_basis_points.to_le_bytes(),
    ]);

    require!(
        data_hash.to_bytes() == params.data_hash,
        CompressedNftVoterError::InvalidMetadata
    );

    let leaf = LeafSchema::new_v0(
        *asset_id,
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
