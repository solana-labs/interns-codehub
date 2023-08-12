use crate::error::NftVoterError;
use crate::state::*;
use crate::tools::accounts::create_nft_action_ticket_account;
use anchor_lang::prelude::*;
use itertools::Itertools;

/// Create NFT action ticket. Everytime a voter want to do some voting with NFT, they need to get a ticket first.
/// This instruction will check the validation of the NFT and create a ticket for the voter.
/// For each action, they get the specific tickets for it. For example, cast vote get nft-castVote-ticket.
///
/// These tickets will be used in the corresponding instructions, ex: cast_nft_vote and update_voter_weight_record.
/// If the action instruction succeed, the ticket will be closed.
/// Otherwise, the ticket will be kept and can be used in the next action.
///
/// This is the instruction for verifying NFT.
#[derive(Accounts)]
#[instruction(voter_weight_action:VoterWeightAction)]
pub struct CreateNftActionTicket<'info> {
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

pub fn create_nft_action_ticket<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateNftActionTicket<'info>>,
    voter_weight_action: VoterWeightAction
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let governing_token_owner = &ctx.accounts.voter_weight_record.governing_token_owner;
    let system_program = &ctx.accounts.system_program.to_account_info();
    let payer = &ctx.accounts.payer.to_account_info();
    let mut unique_nft_mints: Vec<Pubkey> = vec![];
    let ticket_type = format!("nft-{}-ticket", &voter_weight_action).to_string();

    for (nft_info, nft_metadata_info, nft_action_ticket_info) in ctx.remaining_accounts
        .iter()
        .tuples() {
        let (nft_vote_weight, nft_mint) = resolve_nft_vote_weight_and_mint(
            registrar,
            &governing_token_owner,
            nft_info,
            nft_metadata_info,
            &mut unique_nft_mints
        )?;

        if nft_action_ticket_info.data_is_empty() {
            create_nft_action_ticket_account(
                payer,
                &nft_action_ticket_info,
                &registrar.key().clone(),
                &governing_token_owner.key().clone(),
                &nft_mint,
                &ticket_type,
                system_program
            )?;
        }
        let serialized_data = NftActionTicket {
            account_discriminator: NftActionTicket::ACCOUNT_DISCRIMINATOR,
            registrar: registrar.key().clone(),
            governing_token_owner: governing_token_owner.clone(),
            nft_mint: nft_mint.clone(),
            weight: nft_vote_weight,
            expiry: Some(Clock::get()?.slot + 10),
        };

        nft_action_ticket_info.data.borrow_mut().copy_from_slice(&serialized_data.try_to_vec()?);
    }

    Ok(())
}
