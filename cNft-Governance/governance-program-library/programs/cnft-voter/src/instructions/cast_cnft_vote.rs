use crate::error::CompressedNftVoterError;
use crate::utils::accounts::close_cnft_weight_record_account;
use crate::{ id, state::* };
use anchor_lang::prelude::*;
use anchor_lang::Accounts;
use itertools::Itertools;
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
    /// CHECK: Owned by spl-governance instance specified in registrar.governance_program_id
    #[account(owner = registrar.governance_program_id)]
    voter_token_owner_record: UncheckedAccount<'info>,
    pub voter_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn cast_compressed_nft_vote<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CastCompressedNftVote<'info>>,
    proposal: Pubkey
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let voter_weight_record = &mut ctx.accounts.voter_weight_record;
    let payer = &mut ctx.accounts.payer.to_account_info();
    let rent = Rent::get()?;
    let mut voter_weight = 0u64;

    let governing_token_owner = resolve_governing_token_owner(
        registrar,
        &ctx.accounts.voter_token_owner_record,
        &ctx.accounts.voter_authority,
        voter_weight_record
    )?;

    let mut to_closed_accounts = vec![];
    let mut unique_cnft_weight_records: Vec<Pubkey> = vec![];

    for (nft_mint, cnft_weight_record, cnft_vote_record) in ctx.remaining_accounts.iter().tuples() {
        if unique_cnft_weight_records.contains(&cnft_weight_record.key) {
            return Err(CompressedNftVoterError::DuplicatedNftDetected.into());
        }
        let data_bytes = cnft_weight_record.data.clone();
        let data = CnftWeightRecord::try_from_slice(&data_bytes.borrow())?;
        voter_weight = voter_weight.checked_add(data.weight).unwrap();

        require!(cnft_vote_record.data_is_empty(), CompressedNftVoterError::NftAlreadyVoted);
        require!(
            cnft_weight_record.data_is_empty() == false,
            CompressedNftVoterError::NftFailedVerification
        );
        require!(
            *cnft_weight_record.owner == crate::id(),
            CompressedNftVoterError::InvalidPdaOwner
        );
        require!(
            data.nft_owner == governing_token_owner,
            CompressedNftVoterError::VoterDoesNotOwnNft
        );

        let cnft_vote_record_data = CompressedNftVoteRecord {
            account_discriminator: CompressedNftVoteRecord::ACCOUNT_DISCRIMINATOR,
            proposal,
            asset_id: nft_mint.key().clone(),
            governing_token_owner,
            reserved: [0; 8],
        };
        create_and_serialize_account_signed(
            payer,
            &cnft_vote_record,
            &cnft_vote_record_data,
            &[b"cnft-vote-record", proposal.as_ref(), nft_mint.key().as_ref()],
            &id(),
            &ctx.accounts.system_program.to_account_info(),
            &rent,
            0
        )?;
        // adding this is the close the account after cpi transaction
        // https://solana.stackexchange.com/questions/4481/error-processing-instruction-0-sum-of-account-balances-before-and-after-instruc
        // https://solana.stackexchange.com/questions/4519/anchor-error-error-processing-instruction-0-sum-of-account-balances-before-and
        to_closed_accounts.push(cnft_weight_record.to_account_info());
        unique_cnft_weight_records.push(cnft_weight_record.key());
    }

    if
        voter_weight_record.weight_action_target == Some(proposal) &&
        voter_weight_record.weight_action == Some(VoterWeightAction::CastVote)
    {
        // add up if there are more than one nft
        voter_weight_record.voter_weight = voter_weight_record.voter_weight
            .checked_add(voter_weight)
            .unwrap();
    } else {
        voter_weight_record.voter_weight = voter_weight;
    }

    voter_weight_record.voter_weight_expiry = Some(Clock::get()?.slot);

    // The record is only valid for casting vote on the given Proposal
    voter_weight_record.weight_action = Some(VoterWeightAction::CastVote);
    voter_weight_record.weight_action_target = Some(proposal);

    for clased_account in to_closed_accounts.iter() {
        close_cnft_weight_record_account(clased_account, payer)?;
    }
    Ok(())
}
