use crate::error::NftVoterError;
use crate::state::*;
use crate::tools::accounts::create_nft_vote_ticket_account;
use anchor_lang::prelude::*;
use itertools::Itertools;

#[derive(Accounts)]
#[instruction(voter_weight_action:VoterWeightAction)]
pub struct CreateNftVoteTicket<'info> {
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

pub fn create_nft_vote_ticket<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateNftVoteTicket<'info>>,
    voter_weight_action: VoterWeightAction
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let governing_token_owner = &ctx.accounts.voter_weight_record.governing_token_owner;
    let system_program = &ctx.accounts.system_program.to_account_info();
    let payer = &ctx.accounts.payer.to_account_info();
    let mut unique_nft_mints: Vec<Pubkey> = vec![];
    let ticket_type = format!("nft-{}-ticket", &voter_weight_action).to_string();

    for (nft_info, nft_metadata_info, nft_vote_ticket_info) in ctx.remaining_accounts
        .iter()
        .tuples() {
        require!(nft_vote_ticket_info.data_is_empty(), NftVoterError::AccountDataNotEmpty);
        let (nft_vote_weight, nft_mint) = resolve_nft_vote_weight_and_mint(
            registrar,
            &governing_token_owner,
            nft_info,
            nft_metadata_info,
            &mut unique_nft_mints
        )?;

        create_nft_vote_ticket_account(
            payer,
            &nft_vote_ticket_info,
            &registrar.key().clone(),
            &nft_mint,
            &ticket_type,
            system_program
        )?;
        let serialized_data = NftVoteTicket {
            account_discriminator: NftVoteTicket::ACCOUNT_DISCRIMINATOR,
            nft_owner: governing_token_owner.clone(),
            weight: nft_vote_weight,
        };
        // CHECK: if this is this should not be a function, but merge the code into this instruction
        // make this instruction the only method that can serizlize the data
        // so in cast_nft_vote can check if the data is all zero
        // serialize_nft_vote_ticket_account(
        //     &serialized_data.try_to_vec()?,
        //     &nft_vote_ticket_info
        // )?;

        nft_vote_ticket_info.data.borrow_mut().copy_from_slice(&serialized_data.try_to_vec()?);
    }

    Ok(())
}
