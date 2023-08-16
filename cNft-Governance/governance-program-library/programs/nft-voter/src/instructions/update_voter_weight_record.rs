use crate::error::NftVoterError;
use crate::state::*;
use crate::tools::accounts::close_nft_action_ticket_account;
use anchor_lang::prelude::*;

/// Updates VoterWeightRecord to evaluate governance power for non voting use cases: CreateProposal, CreateGovernance etc...
/// This instruction updates VoterWeightRecord which is valid for the current Slot and the given target action only
/// and hance the instruction has to be executed inside the same transaction as the corresponding spl-gov instruction
///
/// Note: UpdateVoterWeight is not cumulative the same way as CastNftVote and hence voter_weight for non voting scenarios
/// can only be used with max 10 NFTs due to Solana transaction size limit
/// It could be supported in future version by introducing bookkeeping accounts to track the NFTs
/// which were already used to calculate the total weight
#[derive(Accounts)]
#[instruction(voter_weight_action:VoterWeightAction)]
pub struct UpdateVoterWeightRecord<'info> {
    /// The NFT voting Registrar
    pub registrar: Account<'info, Registrar>,

    #[account(
        mut,
        constraint = voter_weight_record.realm == registrar.realm
        @ NftVoterError::InvalidVoterWeightRecordRealm,

        constraint = voter_weight_record.governing_token_mint == registrar.governing_token_mint
        @ NftVoterError::InvalidVoterWeightRecordMint,
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

pub fn update_voter_weight_record(
    ctx: Context<UpdateVoterWeightRecord>,
    voter_weight_action: VoterWeightAction
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let voter_weight_record = &mut ctx.accounts.voter_weight_record;
    let governing_token_owner = &voter_weight_record.governing_token_owner;
    let payer = &mut ctx.accounts.payer.to_account_info();

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

    let mut voter_weight = 0u64;
    let mut unique_nft_action_tickets = vec![];

    for nft_action_ticket in ctx.remaining_accounts.iter() {
        if unique_nft_action_tickets.contains(&nft_action_ticket.key) {
            return Err(NftVoterError::DuplicatedNftDetected.into());
        }

        require!(nft_action_ticket.data_is_empty() == false, NftVoterError::NftFailedVerification);
        require!(*nft_action_ticket.owner == crate::id(), NftVoterError::InvalidAccountOwner);

        let data_bytes = nft_action_ticket.data.clone();
        let data = NftActionTicket::try_from_slice(&data_bytes.borrow())?;

        let ticket_type = format!("nft-{}-ticket", &voter_weight_action).to_string();
        let nft_action_ticket_address = get_nft_action_ticket_address(
            &ticket_type,
            &registrar.key(),
            governing_token_owner,
            &data.nft_mint
        ).0;

        require!(
            data.governing_token_owner == *governing_token_owner &&
                nft_action_ticket_address == *nft_action_ticket.key,
            NftVoterError::InvalidNftTicket
        );
        require!(data.expiry.unwrap() >= Clock::get()?.slot, NftVoterError::NftTicketExpired);

        close_nft_action_ticket_account(nft_action_ticket, payer)?;
        unique_nft_action_tickets.push(&nft_action_ticket.key);
        voter_weight = voter_weight.checked_add(data.weight).unwrap();
    }

    voter_weight_record.voter_weight = voter_weight;

    // Record is only valid as of the current slot
    voter_weight_record.voter_weight_expiry = Some(Clock::get()?.slot);

    // Set the action to make it specific and prevent being used for voting
    voter_weight_record.weight_action = Some(voter_weight_action);
    voter_weight_record.weight_action_target = None;

    Ok(())
}
