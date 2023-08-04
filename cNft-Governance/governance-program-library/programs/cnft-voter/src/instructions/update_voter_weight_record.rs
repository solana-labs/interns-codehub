use crate::error::CompressedNftVoterError;
use crate::state::*;
use crate::utils::accounts::close_cnft_weight_record_account;
use anchor_lang::prelude::*;
use spl_account_compression::program::SplAccountCompression;

#[derive(Accounts)]
#[instruction(voter_weight_action: VoterWeightAction, params: Vec<CompressedNftAsset>)]
pub struct UpdateVoterWeightRecord<'info> {
    pub registrar: Account<'info, Registrar>,

    #[account(
        mut,
        constraint = voter_weight_record.realm == registrar.realm @ CompressedNftVoterError::InvalidVoterWeightRecordRealm,
        constraint = voter_weight_record.governing_token_mint == registrar.governing_token_mint @ CompressedNftVoterError::InvalidVoterWeightRecordMint,
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,
    /// CHECK: This account is checked in the instruction
    #[account(mut)]
    pub leaf_owner: UncheckedAccount<'info>,
    pub compression_program: Program<'info, SplAccountCompression>,
}

// to be modify
pub fn update_voter_weight_record<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, UpdateVoterWeightRecord<'info>>,
    voter_weight_action: VoterWeightAction
) -> Result<()> {
    let voter_weight_record = &mut ctx.accounts.voter_weight_record;
    let leaf_owner = &mut ctx.accounts.leaf_owner.to_account_info();

    match voter_weight_action {
        // voter_weight for CastVote action can't be evaluated using this instruction
        VoterWeightAction::CastVote => {
            return err!(CompressedNftVoterError::CastVoteIsNotAllowed);
        }
        | VoterWeightAction::CommentProposal
        | VoterWeightAction::CreateGovernance
        | VoterWeightAction::CreateProposal
        | VoterWeightAction::SignOffProposal => {}
    }

    let mut voter_weight: u64 = 0u64;

    for cnft_weight_record in ctx.remaining_accounts.iter() {
        let data_bytes = cnft_weight_record.try_borrow_mut_data()?;
        let data = CnftWeightRecord::try_from_slice(&data_bytes)?;
        // unwrap() is a method that can be called on Option or Result types.
        // When called on an Option<T>, it will return the value inside if it's Some(T). If it's None, it will panic and crash the program.
        // When called on a Result<T, E>, it will return the value inside if it's Ok(T). If it's Err(E), it will panic and crash the program.
        voter_weight = voter_weight.checked_add(data.weight).unwrap();
        close_cnft_weight_record_account(cnft_weight_record, leaf_owner)?;
    }

    voter_weight_record.voter_weight = voter_weight;
    voter_weight_record.voter_weight_expiry = Some(Clock::get()?.slot);

    voter_weight_record.weight_action = Some(voter_weight_action);
    voter_weight_record.weight_action_target = None;

    Ok(())
}
