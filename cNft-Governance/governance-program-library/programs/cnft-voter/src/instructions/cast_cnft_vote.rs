use crate::error::CompressedNftVoterError;
use crate::utils::helper::*;
use crate::{id, state::*};
use anchor_lang::prelude::*;
use anchor_lang::Accounts;
use spl_account_compression::program::SplAccountCompression;
use spl_governance_tools::account::create_and_serialize_account_signed;

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

    pub collection_mint: UncheckedAccount<'info>,
    pub merkle_tree: UncheckedAccount<'info>,
    pub leaf_owner: UncheckedAccount<'info>,
    pub leaf_delegate: UncheckedAccount<'info>,

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
    params: &VerifyParams2,
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let voter_weight_record = &mut ctx.accounts.voter_weight_record;
    let merkle_tree = &ctx.accounts.merkle_tree.to_account_info();
    let leaf_owner = &ctx.accounts.leaf_owner.to_account_info();
    let leaf_delegate = &ctx.accounts.leaf_delegate.to_account_info();
    let collection = &ctx.accounts.collection_mint.to_account_info();
    let remaining_accounts = &mut ctx.remaining_accounts.to_vec();
    let mut voter_weight = 0u64;
    let mut unique_asset_ids: Vec<Pubkey> = vec![];

    let governing_token_owner = resolve_governing_token_owner(
        registrar,
        &ctx.accounts.voter_token_owner_record,
        &ctx.accounts.voter_authority,
        voter_weight_record,
    )?;

    // require_eq!(
    //     payer.key(),
    //     leaf_owner.key(),
    //     CompressedNftVoterError::LeafOwnerMustBePayer
    // );

    let cnft_vote_record_info = remaining_accounts.pop().unwrap();
    let proofs = remaining_accounts.to_vec();
    let (cnft_vote_weight, asset_id) = resolve_cnft_vote_weight2(
        &registrar,
        &governing_token_owner,
        &collection.key(),
        &merkle_tree,
        &mut unique_asset_ids,
        &leaf_owner,
        &leaf_delegate,
        params,
        proofs,
        &ctx.accounts.compression_program.to_account_info(),
    )?;

    voter_weight = voter_weight.checked_add(cnft_vote_weight as u64).unwrap();
    let rent = Rent::get()?;
    let cnft_vote_record = CompressedNftVoteRecord {
        account_discriminator: CompressedNftVoteRecord::ACCOUNT_DISCRIMINATOR,
        proposal,
        asset_id,
        governing_token_owner,
        reserved: [0; 8],
    };

    // // pseudo-code:
    // // nft data we get nft_metadata, nft_vote_record_info
    // // for (cnft_metadata_info, cnft_vote_record_info) in ctx.remaining_accounts
    // //     get cnft_asset_id and cnft_vote_weight
    // //     add up voter_weight with cnft_vote_weight
    // //     verify cnft_vote_record_info is empty
    // //     create cnft_vote_record_data
    // //     create_and_serialize_account_signed
    require!(
        cnft_vote_record_info.data_is_empty(),
        CompressedNftVoterError::NftAlreadyVoted
    );
    create_and_serialize_account_signed(
        &ctx.accounts.payer.to_account_info(),
        &cnft_vote_record_info,
        &cnft_vote_record,
        &[b"cnft-vote-record", proposal.as_ref(), asset_id.as_ref()],
        &id(),
        &ctx.accounts.system_program.to_account_info(),
        &rent,
        0,
    )?;

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
