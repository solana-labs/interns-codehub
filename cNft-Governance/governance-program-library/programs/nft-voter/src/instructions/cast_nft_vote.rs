use crate::error::NftVoterError;
use crate::{ id, state::* };
use crate::tools::accounts::close_nft_vote_ticket_account;
use anchor_lang::prelude::*;
use anchor_lang::Accounts;
use itertools::Itertools;
use spl_governance_tools::account::create_and_serialize_account_signed;

/// Casts NFT vote. The NFTs used for voting are tracked using NftVoteRecord accounts
/// This instruction updates VoterWeightRecord which is valid for the current Slot and the target Proposal only
/// and hance the instruction has to be executed inside the same transaction as spl-gov.CastVote
///
/// CastNftVote is accumulative and can be invoked using several transactions if voter owns more than 5 NFTs to calculate total voter_weight
/// In this scenario only the last CastNftVote should be bundled  with spl-gov.CastVote in the same transaction
///
/// CastNftVote instruction and NftVoteRecord are not directional. They don't record vote choice (ex Yes/No)
/// VoteChoice is recorded by spl-gov in VoteRecord and this CastNftVote only tracks voting NFTs
///
#[derive(Accounts)]
#[instruction(proposal: Pubkey)]
pub struct CastNftVote<'info> {
    /// The NFT voting registrar
    pub registrar: Account<'info, Registrar>,

    #[account(
        mut,
        constraint = voter_weight_record.realm == registrar.realm
        @ NftVoterError::InvalidVoterWeightRecordRealm,
        constraint = voter_weight_record.governing_token_mint == registrar.governing_token_mint
        @ NftVoterError::InvalidVoterWeightRecordMint,
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,

    /// TokenOwnerRecord of the voter who casts the vote
    /// /// CHECK: Owned by spl-governance instance specified in registrar.governance_program_id
    #[account(owner = registrar.governance_program_id)]
    voter_token_owner_record: UncheckedAccount<'info>,

    /// Authority of the voter who casts the vote
    /// It can be either governing_token_owner or its delegate and must sign this instruction
    pub voter_authority: Signer<'info>,

    /// The account which pays for the transaction
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Casts vote with the NFT
pub fn cast_nft_vote<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CastNftVote<'info>>,
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
    let mut unique_nft_vote_tickets: Vec<Pubkey> = vec![];

    for (nft_mint_info, nft_vote_ticket_info, nft_vote_record_info) in ctx.remaining_accounts
        .iter()
        .tuples() {
        if unique_nft_vote_tickets.contains(&nft_vote_ticket_info.key) {
            return Err(NftVoterError::DuplicatedNftDetected.into());
        }
        // Create NFT vote record to ensure the same NFT hasn't been already used for voting
        // Note: The correct PDA of the NftVoteRecord is validated in create_and_serialize_account_signed
        // It ensures the NftVoteRecord is for ('nft-vote-record',proposal,nft_mint) seeds
        require!(nft_vote_record_info.data_is_empty(), NftVoterError::NftAlreadyVoted);
        require!(
            nft_vote_ticket_info.data_is_empty() == false, //this might be a problem
            NftVoterError::NftFailedVerification
        );
        require!(*nft_vote_ticket_info.owner == crate::id(), NftVoterError::InvalidPdaOwner);

        let data_bytes = nft_vote_ticket_info.data.clone();
        let data = NftVoteTicket::try_from_slice(&data_bytes.borrow())?;
        voter_weight = voter_weight.checked_add(data.weight).unwrap();

        require!(data.nft_owner == governing_token_owner, NftVoterError::VoterDoesNotOwnNft);

        // Note: proposal.governing_token_mint must match voter_weight_record.governing_token_mint
        // We don't verify it here because spl-gov does the check in cast_vote
        // and it would reject voter_weight_record if governing_token_mint doesn't match

        // Note: Once the NFT plugin is enabled the governing_token_mint is used only as identity
        // for the voting population and the tokens of that mint are no longer used
        let nft_vote_record = NftVoteRecord {
            account_discriminator: NftVoteRecord::ACCOUNT_DISCRIMINATOR,
            proposal,
            nft_mint: nft_mint_info.key().clone(),
            governing_token_owner,
            reserved: [0; 8],
        };

        // Anchor doesn't natively support dynamic account creation using remaining_accounts
        // and we have to take it on the manual drive
        create_and_serialize_account_signed(
            &ctx.accounts.payer.to_account_info(),
            nft_vote_record_info,
            &nft_vote_record,
            &get_nft_vote_record_seeds(&proposal, &nft_mint_info.key()),
            &id(),
            &ctx.accounts.system_program.to_account_info(),
            &rent,
            0
        )?;

        // adding this is the close the account after cpi transaction
        // https://solana.stackexchange.com/questions/4481/error-processing-instruction-0-sum-of-account-balances-before-and-after-instruc
        // https://solana.stackexchange.com/questions/4519/anchor-error-error-processing-instruction-0-sum-of-account-balances-before-and
        to_closed_accounts.push(nft_vote_ticket_info.to_account_info());
        unique_nft_vote_tickets.push(nft_vote_ticket_info.key());
    }

    if
        voter_weight_record.weight_action_target == Some(proposal) &&
        voter_weight_record.weight_action == Some(VoterWeightAction::CastVote)
    {
        // If cast_nft_vote is called for the same proposal then we keep accumulating the weight
        // this way cast_nft_vote can be called multiple times in different transactions to allow voting with any number of NFTs
        voter_weight_record.voter_weight = voter_weight_record.voter_weight
            .checked_add(voter_weight)
            .unwrap();
    } else {
        voter_weight_record.voter_weight = voter_weight;
    }

    // The record is only valid as of the current slot
    voter_weight_record.voter_weight_expiry = Some(Clock::get()?.slot);

    // The record is only valid for casting vote on the given Proposal
    voter_weight_record.weight_action = Some(VoterWeightAction::CastVote);
    voter_weight_record.weight_action_target = Some(proposal);

    for clased_account in to_closed_accounts.iter() {
        close_nft_vote_ticket_account(clased_account, payer)?;
    }
    Ok(())
}
