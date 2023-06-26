use crate::error::CompressedNftVoterError;
use crate::utils::helper::*;
use crate::{id, state::*};
use anchor_lang::prelude::*;
use anchor_lang::Accounts;
// use itertools::Itertools;
use mpl_bubblegum::state::TreeConfig;
use spl_account_compression::program::SplAccountCompression;
// use spl_governance_tools::account::create_and_serialize_account_signed;

#[derive(Accounts)]
#[instruction(proposal: Pubkey)]
pub struct CastCompressedNftVote<'info> {
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

    #[account(
        seeds = [merkle_tree.key().as_ref()],
        bump,
    )]
    pub tree_authority: Account<'info, TreeConfig>,
    pub collection_mint: UncheckedAccount<'info>,
    pub leaf_owner: UncheckedAccount<'info>,
    pub leaf_delegate: UncheckedAccount<'info>,
    pub merkle_tree: UncheckedAccount<'info>,

    pub voter_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,

    pub compression_program: Program<'info, SplAccountCompression>,
    pub system_program: Program<'info, System>,
}

// so far only one nft is supported
pub fn cast_cnft_vote<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CastCompressedNftVote<'info>>,
    proposal: Pubkey,
    params: &VerifyParams,
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let voter_weight_record = &mut ctx.accounts.voter_weight_record;
    let payer = &ctx.accounts.payer;
    let merkle_tree = &ctx.accounts.merkle_tree;
    let leaf_owner = &ctx.accounts.leaf_owner;
    let leaf_delegate = &ctx.accounts.leaf_delegate;
    let collection = &ctx.accounts.collection_mint;
    let mut voter_weight = 0u64;
    let mut unique_asset_ids: Vec<Pubkey> = vec![];

    let governing_token_owner = resolve_governing_token_owner(
        registrar,
        &ctx.accounts.voter_token_owner_record,
        &ctx.accounts.voter_authority,
        voter_weight_record,
    )?;

    require_eq!(
        payer.key(),
        leaf_owner.key(),
        CompressedNftVoterError::LeafOwnerMustBePayer
    );

    let (nft_vote_weight, asset_id) = resolve_cnft_vote_weight(
        &registrar,
        &collection.key(),
        &governing_token_owner,
        &merkle_tree,
        &leaf_owner.key(),
        &leaf_delegate.key(),
        params,
        ctx.remaining_accounts.to_vec(),
        &ctx.accounts.compression_program.to_account_info(),
        &mut unique_asset_ids,
    )?;

    voter_weight = voter_weight.checked_add(nft_vote_weight as u64).unwrap();
    let rent = Rent::get()?;

    let nft_vote_record = CompressedNftVoteRecord {
        account_discriminator: CompressedNftVoteRecord::ACCOUNT_DISCRIMINATOR,
        proposal,
        asset_id,
        governing_token_owner,
        reserved: [0; 8],
    };

    // pseudo-code:
    // nft data we get nft_metadata, nft_vote_record_info
    // for (cnft_metadata_info, cnft_vote_record_info) in ctx.remaining_accounts
    //     get cnft_asset_id and cnft_vote_weight
    //     add up voter_weight with cnft_vote_weight
    //     verify cnft_vote_record_info is empty
    //     create cnft_vote_record_data
    //     create_and_serialize_account_signed

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
