use crate::error::NftVoterError;
use crate::state::*;
use anchor_lang::prelude::*;
use spl_account_compression::program::SplAccountCompression;
use crate::tools::accounts::{
    create_nft_weight_record_account,
    serialize_nft_weight_record_account,
};

#[derive(Accounts)]
#[instruction(params: Vec<CompressedNftAsset>)]
pub struct CreateCnftWeightRecord<'info> {
    pub registrar: Account<'info, Registrar>,

    #[account(
        mut,
        constraint = voter_weight_record.realm == registrar.realm
        @ NftVoterError::InvalidVoterWeightRecordRealm,
        constraint = voter_weight_record.governing_token_mint == registrar.governing_token_mint
        @ NftVoterError::InvalidVoterWeightRecordMint,
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,

    /// CHECK: This account is checked in the instruction
    pub leaf_owner: UncheckedAccount<'info>,
    pub voter_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,

    pub compression_program: Program<'info, SplAccountCompression>,
    pub system_program: Program<'info, System>,
}

pub fn create_cnft_weight_record<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateCnftWeightRecord<'info>>,
    params: Vec<CompressedNftAsset>
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let governing_token_owner = &ctx.accounts.voter_weight_record.governing_token_owner;
    let leaf_owner = &ctx.accounts.leaf_owner.to_account_info();
    let remaining_accounts = &mut ctx.remaining_accounts.to_vec();
    let compression_program = &ctx.accounts.compression_program.to_account_info();
    let system_program = &ctx.accounts.system_program.to_account_info();
    let payer = &ctx.accounts.payer.to_account_info();
    let mut unique_asset_ids: Vec<Pubkey> = vec![];

    let mut start = 0;
    for i in 0..params.len() {
        let param = &params[i];
        let proof_len = param.proof_len;
        let accounts = &remaining_accounts[start..start + (proof_len as usize) + 2];

        let tree_account = accounts[0].clone();
        let proofs = accounts[1..(proof_len as usize) + 1].to_vec();
        let mut cnft_weight_record_info = accounts.last().unwrap().clone();

        require!(cnft_weight_record_info.data_is_empty(), NftVoterError::AccountDataNotEmpty);

        let (cnft_vote_weight, asset_id) = resolve_cnft_vote_weight(
            &registrar,
            &governing_token_owner,
            &tree_account,
            &mut unique_asset_ids,
            &leaf_owner,
            &param,
            proofs,
            compression_program
        )?;

        create_nft_weight_record_account(
            payer,
            &cnft_weight_record_info,
            &asset_id,
            system_program
        )?;
        let serialized_data = NftWeightRecord {
            account_discriminator: NftWeightRecord::ACCOUNT_DISCRIMINATOR,
            nft_owner: governing_token_owner.clone(),
            weight: cnft_vote_weight,
        };
        serialize_nft_weight_record_account(
            &serialized_data.try_to_vec()?,
            &mut cnft_weight_record_info
        )?;

        start += (proof_len as usize) + 2;
    }

    Ok(())
}
