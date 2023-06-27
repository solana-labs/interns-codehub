use crate::error::CompressedNftVoterError;
use crate::{id, state::*};
use anchor_lang::prelude::*;
use anchor_lang::Accounts;
use itertools::Itertools;
use spl_governance_tools::account::create_and_serialize_account_signed;

#[derive(Accounts)]
#[instruction(proposal: Pubkey)]
pub struct CastNftVote<'info> {
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
    #[account(
        owner = registrar.governance_program_id
     )]
    voter_token_owner_record: UncheckedAccount<'info>,

    pub voter_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn cast_nft_vote<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CastNftVote<'info>>,
    proposal: Pubkey,
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let voter_weight_record = &mut ctx.accounts.voter_weight_record;

    let governing_token_owner = resolve_governing_token_owner(
        registrar,
        &ctx.accounts.voter_token_owner_record,
        &ctx.accounts.voter_authority,
        voter_weight_record,
    )?;

    let mut voter_weight = 0u64;
    let mut unique_nft_mints: Vec<Pubkey> = vec![];

    let rent = Rent::get()?;

    for (nft_info, nft_metadata_info, nft_vote_record_info) in
        ctx.remaining_accounts.iter().tuples()
    {
        // nft_mint should be nft_asset_id
        let (nft_vote_weight, nft_mint) = resolve_nft_vote_weight_and_mint(
            registrar,
            &governing_token_owner,
            nft_info,
            nft_metadata_info,
            &mut unique_nft_mints,
        )?;

        voter_weight = voter_weight.checked_add(nft_vote_weight as u64).unwrap();

        require!(
            nft_vote_record_info.data_is_empty(),
            CompressedNftVoterError::NftAlreadyVoted
        );

        // Note: proposal.governing_token_mint must match voter_weight_record.governing_token_mint
        // We don't verify it here because spl-gov does the check in cast_vote
        // and it would reject voter_weight_record if governing_token_mint doesn't match

        // Note: Once the NFT plugin is enabled the governing_token_mint is used only as identity
        // for the voting population and the tokens of that mint are no longer used
        let nft_vote_record = NftVoteRecord {
            account_discriminator: NftVoteRecord::ACCOUNT_DISCRIMINATOR,
            proposal,
            nft_mint,
            governing_token_owner,
            reserved: [0; 8],
        };

        // Anchor doesn't natively support dynamic account creation using remaining_accounts
        // and we have to take it on the manual drive
        create_and_serialize_account_signed(
            &ctx.accounts.payer.to_account_info(),
            nft_vote_record_info,
            &nft_vote_record,
            &[b"nft-vote-record", &proposal.as_ref(), &nft_mint.as_ref()],
            &id(),
            &ctx.accounts.system_program.to_account_info(),
            &rent,
            0,
        )?;
    }

    if voter_weight_record.weight_action_target == Some(proposal)
        && voter_weight_record.weight_action == Some(VoterWeightAction::CastVote)
    {
        // add up if there are more than one nft
        voter_weight_record.voter_weight = voter_weight_record
            .voter_weight
            .checked_add(voter_weight)
            .unwrap();
    } else {
        voter_weight_record.voter_weight = voter_weight;
    }

    // dont know what does this mean exactly
    voter_weight_record.voter_weight_expiry = Some(Clock::get()?.slot);

    // The record is only valid for casting vote on the given Proposal
    voter_weight_record.weight_action = Some(VoterWeightAction::CastVote);
    voter_weight_record.weight_action_target = Some(proposal);

    Ok(())
}
