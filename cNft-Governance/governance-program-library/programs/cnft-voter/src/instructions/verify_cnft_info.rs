/// USE FOR TESTING ONLY
use crate::error::CompressedNftVoterError;
use crate::utils::cnft_verification::CompressedNftAsset;
use anchor_lang::prelude::*;
use mpl_bubblegum::error::BubblegumError;
use mpl_bubblegum::hash_metadata;
use mpl_bubblegum::state::leaf_schema::LeafSchema;
use mpl_bubblegum::utils::get_asset_id;
use spl_account_compression::cpi::accounts::VerifyLeaf;
use spl_account_compression::program::SplAccountCompression;

#[derive(Accounts)]
pub struct VerifyCompressedNftInfo<'info> {
    /// CHECK: unsafe
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK: This account is checked in the instruction
    pub leaf_owner: UncheckedAccount<'info>,
    /// CHECK: This account is checked in the instruction
    pub leaf_delegate: UncheckedAccount<'info>,
    pub payer: Signer<'info>,
    pub compression_program: Program<'info, SplAccountCompression>,
    pub system_program: Program<'info, System>,
}

pub fn verify_compressed_nft_info<'info>(
    ctx: Context<'_, '_, '_, 'info, VerifyCompressedNftInfo<'info>>,
    params: &CompressedNftAsset,
) -> Result<()> {
    let merkle_tree = ctx.accounts.merkle_tree.to_account_info();
    let leaf_owner = &ctx.accounts.leaf_owner.to_account_info();
    let leaf_delegate = &ctx.accounts.leaf_delegate.to_account_info();
    let metadata = params.metadata.clone();
    let proofs = ctx.remaining_accounts.to_vec();
    require!(
        leaf_owner.is_signer || leaf_delegate.is_signer,
        BubblegumError::LeafAuthorityMustSign
    );

    let asset_id = get_asset_id(&merkle_tree.key(), params.nonce);
    require_eq!(
        asset_id,
        params.asset_id,
        CompressedNftVoterError::InvalidAssetId
    );

    let data_hash = hash_metadata(&metadata).unwrap();
    require!(
        data_hash == params.data_hash,
        CompressedNftVoterError::InvalidMetadata
    );

    let leaf = LeafSchema::new_v0(
        asset_id,
        leaf_owner.key(),
        leaf_delegate.key(),
        params.nonce,
        params.data_hash,
        params.creator_hash,
    );

    let cpi_ctx = CpiContext::new(
        ctx.accounts.compression_program.to_account_info(),
        VerifyLeaf { merkle_tree },
    )
    .with_remaining_accounts(proofs);
    spl_account_compression::cpi::verify_leaf(cpi_ctx, params.root, leaf.to_node(), params.index)?;

    Ok(())
}
