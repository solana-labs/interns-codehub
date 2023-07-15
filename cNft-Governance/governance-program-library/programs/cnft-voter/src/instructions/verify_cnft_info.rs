/// USE FOR TESTING ONLY
use crate::state::*;
use anchor_lang::prelude::*;
use mpl_bubblegum::error::BubblegumError;
use mpl_bubblegum::utils::get_asset_id;
use spl_account_compression::program::SplAccountCompression;

#[derive(Accounts)]
#[instruction(params: CompressedNftAsset)]
pub struct VerifyCompressedNftInfo<'info> {
    /// CHECK: This account is checked in the instruction
    pub leaf_owner: UncheckedAccount<'info>,
    pub payer: Signer<'info>,
    pub compression_program: Program<'info, SplAccountCompression>,
}

pub fn verify_compressed_nft_info<'info>(
    ctx: Context<'_, '_, '_, 'info, VerifyCompressedNftInfo<'info>>,
    params: CompressedNftAsset
) -> Result<()> {
    let leaf_owner = &ctx.accounts.leaf_owner.to_account_info();
    let merkle_tree = ctx.remaining_accounts[0].clone();
    let proofs = ctx.remaining_accounts[1..].to_vec();
    let compression_program = &ctx.accounts.compression_program.to_account_info();
    require!(leaf_owner.is_signer, BubblegumError::LeafAuthorityMustSign);

    let asset_id = get_asset_id(&merkle_tree.key(), params.nonce);
    verify_compressed_nft(
        &merkle_tree,
        &asset_id,
        &leaf_owner.key(),
        &params,
        proofs,
        compression_program
    )?;
    Ok(())
}
