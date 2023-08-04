use crate::error::NftVoterError;
use crate::state::*;
use crate::tools::accounts::{
    create_nft_weight_record_account,
    serialize_nft_weight_record_account,
};
use anchor_lang::prelude::*;
use itertools::Itertools;

#[derive(Accounts)]
pub struct CreateNftWeightRecord<'info> {
    pub registrar: Account<'info, Registrar>,

    #[account(
        mut,
        constraint = voter_weight_record.realm == registrar.realm
        @ NftVoterError::InvalidVoterWeightRecordRealm,
        constraint = voter_weight_record.governing_token_mint == registrar.governing_token_mint
        @ NftVoterError::InvalidVoterWeightRecordMint,
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,

    pub voter_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_nft_weight_record<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateNftWeightRecord<'info>>
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let governing_token_owner = &ctx.accounts.voter_weight_record.governing_token_owner;
    let system_program = &ctx.accounts.system_program.to_account_info();
    let payer = &ctx.accounts.payer.to_account_info();
    let mut unique_nft_mints: Vec<Pubkey> = vec![];

    for (nft_info, nft_metadata_info, nft_weight_record_info) in ctx.remaining_accounts
        .iter()
        .tuples() {
        require!(nft_weight_record_info.data_is_empty(), NftVoterError::AccountDataNotEmpty);
        let (nft_vote_weight, nft_mint) = resolve_nft_vote_weight_and_mint(
            registrar,
            &governing_token_owner,
            nft_info,
            nft_metadata_info,
            &mut unique_nft_mints
        )?;

        create_nft_weight_record_account(
            payer,
            &nft_weight_record_info,
            &nft_mint,
            system_program
        )?;
        let serialized_data = NftWeightRecord {
            account_discriminator: NftWeightRecord::ACCOUNT_DISCRIMINATOR,
            nft_owner: governing_token_owner.clone(),
            weight: nft_vote_weight,
        };
        serialize_nft_weight_record_account(
            &serialized_data.try_to_vec()?,
            &nft_weight_record_info
        )?;
    }

    Ok(())
}
