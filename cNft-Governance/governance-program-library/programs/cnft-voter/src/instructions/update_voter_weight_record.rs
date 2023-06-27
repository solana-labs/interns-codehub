use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::CompressedNftVoterError;
use itertools::Itertools;

#[derive(Accounts)]
#[instruction(voter_weight_action: VoterWeightAction)]
pub struct UpdateVoterWeightRecord<'info> {
    pub registrar: Account<'info, Registrar>,

    #[account(
        mut,
        constraint = voter_weight_record.realm == registrar.realm @ CompressedNftVoterError::InvalidVoterWeightRecordRealm,
        constraint = voter_weight_record.governing_token_mint == registrar.governing_token_mint @ CompressedNftVoterError::InvalidVoterWeightRecordMint,
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,
}

// to be modify
pub fn update_voter_weight_record(ctx: Context<UpdateVoterWeightRecord>, voter_weight_action: VoterWeightAction) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let voter_weight_record = &mut ctx.accounts.voter_weight_record;
    let governing_token_owner = &voter_weight_record.governing_token_owner;

    match voter_weight_action {
        // voter_weight for CastVote action can't be evaluated using this instruction
        VoterWeightAction::CastVote => return err!(CompressedNftVoterError::CastVoteIsNotAllowed),
        VoterWeightAction::CommentProposal
        | VoterWeightAction::CreateGovernance
        | VoterWeightAction::CreateProposal
        | VoterWeightAction::SignOffProposal => {}
    }

    let mut voter_weight: u64 = 0u64;

    let mut unique_nft_mints: Vec<Pubkey> = vec![];

    for (nft_info, nft_metadata_info) in ctx.remaining_accounts.iter().tuples() {
        let nft_vote_weight = resolve_nft_vote_weight_and_mint(
            registrar,
            governing_token_owner,
            nft_info,
            nft_metadata_info,
            &mut unique_nft_mints,
        )?.0;

        //  unwrap() is a method that can be called on Option or Result types.
        // When called on an Option<T>, it will return the value inside if it's Some(T). If it's None, it will panic and crash the program.
        // When called on a Result<T, E>, it will return the value inside if it's Ok(T). If it's Err(E), it will panic and crash the program.
        voter_weight = voter_weight.checked_add(nft_vote_weight as u64).unwrap();
    }

    voter_weight_record.voter_weight = voter_weight;
    voter_weight_record.voter_weight_expiry = Some(Clock::get()?.slot);

    voter_weight_record.weight_action = Some(voter_weight_action);
    voter_weight_record.weight_action_target = None;

    Ok(())
}

