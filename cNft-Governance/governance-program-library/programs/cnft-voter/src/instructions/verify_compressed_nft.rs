use std::borrow::BorrowMut;

use crate::error::CompressedNftVoterError;
/// USE FOR TESTING ONLY
use crate::state::*;
use anchor_lang::prelude::*;
use spl_account_compression::program::SplAccountCompression;
use crate::utils::accounts::{
    create_cnft_weight_record_account,
    serialize_cnft_weight_record_account,
};

#[derive(Accounts)]
#[instruction(params: CompressedNftAsset)]
pub struct VerifyCompressedNft<'info> {
    pub registrar: Account<'info, Registrar>,

    #[account(
        mut,
        constraint = voter_weight_record.realm == registrar.realm
        @ CompressedNftVoterError::InvalidVoterWeightRecordRealm,
        constraint = voter_weight_record.governing_token_mint == registrar.governing_token_mint
        @ CompressedNftVoterError::InvalidVoterWeightRecordMint,
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,

    // owner should be crate::id()
    /// CHECK: Owned by spl-governance instance specified in registrar.governance_program_id
    #[account(owner = registrar.governance_program_id)]
    voter_token_owner_record: UncheckedAccount<'info>,
    /// CHECK: This account is checked in the instruction
    pub leaf_owner: UncheckedAccount<'info>,
    pub voter_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,

    pub compression_program: Program<'info, SplAccountCompression>,
    pub system_program: Program<'info, System>,
}

pub fn verify_cnft_metadata<'info>(
    ctx: Context<'_, '_, '_, 'info, VerifyCompressedNft<'info>>,
    params: CompressedNftAsset
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let voter_weight_record = &mut ctx.accounts.voter_weight_record;
    let leaf_owner = &ctx.accounts.leaf_owner.to_account_info();
    let remaining_accounts = &mut ctx.remaining_accounts.to_vec();
    let compression_program = &ctx.accounts.compression_program.to_account_info();
    let system_program = &ctx.accounts.system_program.to_account_info();
    let payer = &ctx.accounts.payer.to_account_info();
    let mut unique_asset_ids: Vec<Pubkey> = vec![];

    let governing_token_owner = resolve_governing_token_owner(
        registrar,
        &ctx.accounts.voter_token_owner_record,
        &ctx.accounts.voter_authority,
        voter_weight_record
    )?;

    let proof_len = params.proof_len;

    let tree_account = remaining_accounts[0].clone();
    let proofs = remaining_accounts[1..(proof_len as usize) + 1].to_vec();
    let mut cnft_weight_record_info = remaining_accounts[(proof_len as usize) + 1].borrow_mut();
    let (cnft_vote_weight, asset_id) = resolve_cnft_vote_weight(
        &registrar,
        &governing_token_owner,
        &tree_account,
        &mut unique_asset_ids,
        &leaf_owner,
        &params,
        proofs,
        compression_program
    )?;

    create_cnft_weight_record_account(payer, cnft_weight_record_info, &asset_id, system_program)?;
    let serialized_data = CnftWeightRecord {
        weight: cnft_vote_weight,
    };
    serialize_cnft_weight_record_account(
        &serialized_data.try_to_vec()?,
        &mut cnft_weight_record_info
    )?;

    Ok(())
}
