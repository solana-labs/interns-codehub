use crate::error::NftVoterError;
use crate::state::*;
use anchor_lang::prelude::*;
use spl_account_compression::program::SplAccountCompression;

#[derive(Accounts)]
#[instruction(voter_weight_action: VoterWeightAction, params: Vec<CompressedNftAsset>)]
pub struct UpdateCnftVoterWeightRecord<'info> {
    pub registrar: Account<'info, Registrar>,

    #[account(
        mut,
        constraint = voter_weight_record.realm == registrar.realm @ NftVoterError::InvalidVoterWeightRecordRealm,
        constraint = voter_weight_record.governing_token_mint == registrar.governing_token_mint @ NftVoterError::InvalidVoterWeightRecordMint,
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,
    /// CHECK: This account is checked in the instruction
    pub leaf_owner: UncheckedAccount<'info>,
    pub compression_program: Program<'info, SplAccountCompression>,
}

// to be modify
pub fn update_cnft_voter_weight_record<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, UpdateCnftVoterWeightRecord<'info>>,
    voter_weight_action: VoterWeightAction,
    params: Vec<CompressedNftAsset>
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let voter_weight_record = &mut ctx.accounts.voter_weight_record;
    let governing_token_owner = &voter_weight_record.governing_token_owner;
    let leaf_owner = &ctx.accounts.leaf_owner.to_account_info();
    let remaining_accounts = &mut ctx.remaining_accounts.to_vec();
    let compression_program = &ctx.accounts.compression_program.to_account_info();

    match voter_weight_action {
        // voter_weight for CastVote action can't be evaluated using this instruction
        VoterWeightAction::CastVote => {
            return err!(NftVoterError::CastVoteIsNotAllowed);
        }
        | VoterWeightAction::CommentProposal
        | VoterWeightAction::CreateGovernance
        | VoterWeightAction::CreateProposal
        | VoterWeightAction::SignOffProposal => {}
    }

    let mut voter_weight: u64 = 0u64;
    let mut unique_asset_ids: Vec<Pubkey> = vec![];

    let mut start: usize = 0;
    for i in 0..params.len() {
        let param = &params[i];
        let proof_len = param.proof_len;
        let cnft_info = &remaining_accounts[start..start + (proof_len as usize) + 1];

        let tree_account = cnft_info[0].clone();
        let proofs = cnft_info[1..].to_vec();
        let cnft_vote_weight = resolve_cnft_vote_weight(
            &registrar,
            &governing_token_owner,
            &tree_account,
            &mut unique_asset_ids,
            &leaf_owner,
            param,
            proofs,
            compression_program
        )?.0;
        // unwrap() is a method that can be called on Option or Result types.
        // When called on an Option<T>, it will return the value inside if it's Some(T). If it's None, it will panic and crash the program.
        // When called on a Result<T, E>, it will return the value inside if it's Ok(T). If it's Err(E), it will panic and crash the program.
        voter_weight = voter_weight.checked_add(cnft_vote_weight as u64).unwrap();
        start += (proof_len as usize) + 1;
    }

    voter_weight_record.voter_weight = voter_weight;
    voter_weight_record.voter_weight_expiry = Some(Clock::get()?.slot);

    voter_weight_record.weight_action = Some(voter_weight_action);
    voter_weight_record.weight_action_target = None;

    Ok(())
}
