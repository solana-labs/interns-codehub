use crate::error::NftVoterError;
use crate::state::*;
use anchor_lang::prelude::*;
use spl_account_compression::program::SplAccountCompression;
use crate::tools::accounts::create_nft_action_ticket_account;

/// Create NFT action ticket. Everytime a voter want to do some voting with NFT, they need to get a ticket first.
/// This instruction will check the validation of the NFT and create a ticket for the voter.
/// For each action, they get the specific tickets for it. For example, cast vote get nft-castVote-ticket.
///
/// These tickets will be used in the corresponding instructions, ex: cast_nft_vote and update_voter_weight_record.
/// If the action instruction succeed, the ticket will be closed.
/// Otherwise, the ticket will be kept and can be used in the next action.
///
/// This is the instruction for verifying compressed NFT.
#[derive(Accounts)]
#[instruction(voter_weight_action:VoterWeightAction, params: Vec<CompressedNftAsset>)]
pub struct CreateCnftActionTicket<'info> {
    pub registrar: Account<'info, Registrar>,

    #[account(
        mut,
        constraint = voter_weight_record.realm == registrar.realm
        @ NftVoterError::InvalidVoterWeightRecordRealm,
        constraint = voter_weight_record.governing_token_mint == registrar.governing_token_mint
        @ NftVoterError::InvalidVoterWeightRecordMint,
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,

    /// CHECK: This account is checked in the instruction
    pub leaf_owner: UncheckedAccount<'info>,
    pub voter_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,

    pub compression_program: Program<'info, SplAccountCompression>,
    pub system_program: Program<'info, System>,
}

pub fn create_cnft_action_ticket<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateCnftActionTicket<'info>>,
    voter_weight_action: VoterWeightAction,
    params: Vec<CompressedNftAsset>
) -> Result<()> {
    let registrar = &ctx.accounts.registrar;
    let governing_token_owner = &ctx.accounts.voter_weight_record.governing_token_owner;
    let leaf_owner = &ctx.accounts.leaf_owner.to_account_info();
    let remaining_accounts = &mut ctx.remaining_accounts.to_vec();
    let compression_program = &ctx.accounts.compression_program.to_account_info();
    let system_program = &ctx.accounts.system_program.to_account_info();
    let payer = &ctx.accounts.payer.to_account_info();
    let mut unique_asset_ids: Vec<Pubkey> = vec![];

    let mut start = 0;
    for i in 0..params.len() {
        let param = &params[i];
        let proof_len = param.proof_len;
        let accounts = &remaining_accounts[start..start + (proof_len as usize) + 2];

        let tree_account = accounts[0].clone();
        let proofs = accounts[1..(proof_len as usize) + 1].to_vec();
        let cnft_action_ticket_info = accounts.last().unwrap().clone();
        let ticket_type = format!("nft-{}-ticket", &voter_weight_action).to_string();

        let (cnft_vote_weight, asset_id) = resolve_cnft_vote_weight(
            &registrar,
            &governing_token_owner,
            &tree_account,
            &mut unique_asset_ids,
            &leaf_owner,
            &param,
            proofs,
            compression_program
        )?;

        create_nft_action_ticket_account(
            payer,
            &cnft_action_ticket_info,
            &registrar.key().clone(),
            &governing_token_owner,
            &asset_id,
            &ticket_type,
            system_program
        )?;
        let serialized_data = NftActionTicket {
            account_discriminator: NftActionTicket::ACCOUNT_DISCRIMINATOR,
            registrar: registrar.key().clone(),
            governing_token_owner: governing_token_owner.clone(),
            nft_mint: asset_id.clone(),
            weight: cnft_vote_weight,
            expiry: Some(Clock::get()?.slot + 10),
        };
        // serialize_nft_action_ticket_account(
        //     &serialized_data.try_to_vec()?,
        //     &mut cnft_action_ticket_info
        // )?;
        cnft_action_ticket_info.data.borrow_mut().copy_from_slice(&serialized_data.try_to_vec()?);

        start += (proof_len as usize) + 2;
    }

    Ok(())
}
