use anchor_lang::prelude::*;
use crate::tools::anchor::DISCRIMINATOR_SIZE;
use borsh::{ BorshDeserialize, BorshSchema, BorshSerialize };
use solana_program::program_pack::IsInitialized;
use spl_governance_tools::account::{ get_account_data, AccountMaxSize };

pub const NFT_VOTE_TICKET_SIZE: usize = DISCRIMINATOR_SIZE + 32 + 32 + 32 + 8;

// maybe should moce the nft_owner as part of the seeds
// so that if the owner transfer the nft to new owner, otherwise
// require!(data.nft_owner == governing_token_owner, NftVoterError::VoterDoesNotOwnNft); will fail
// and instead to store nft_owner or weight, perhaps should store to-be-verified data?
// or maybe not? cuz the no-matter the sybil attack exist that nft-owner keep transfer and vot
// nft_vote_record.data_is_empty() will still block the second vote with the same nft
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct NftVoteTicket {
    pub account_discriminator: [u8; 8],
    pub registrar: Pubkey,
    pub governing_token_owner: Pubkey,
    pub nft_mint: Pubkey,
    pub weight: u64,
}

impl NftVoteTicket {
    pub fn new(registrar: Pubkey, owner: Pubkey, nft_mint: Pubkey, weight: u64) -> Self {
        Self {
            account_discriminator: NftVoteTicket::ACCOUNT_DISCRIMINATOR,
            registrar: registrar,
            governing_token_owner: owner,
            nft_mint: nft_mint,
            weight,
        }
    }

    pub fn get_weight(&self) -> u64 {
        self.weight
    }
}

impl NftVoteTicket {
    /// sha256("account:NftVoteTicket")
    /// python:
    /// from hashlib import sha256
    /// list(sha256("account:NftVoteTicket".encode()).digest())[:8]
    pub const ACCOUNT_DISCRIMINATOR: [u8; 8] = [170, 179, 4, 130, 24, 148, 185, 97];
}

impl AccountMaxSize for NftVoteTicket {}

impl IsInitialized for NftVoteTicket {
    fn is_initialized(&self) -> bool {
        self.account_discriminator == NftVoteTicket::ACCOUNT_DISCRIMINATOR
    }
}

/// ticket_type = format!("nft-{}-ticket", &voter_weight_action).to_string();
pub fn get_nft_vote_ticket_seeds<'a>(
    ticket_type: &'a str,
    registrar: &'a Pubkey,
    owner: &'a Pubkey,
    nft_mint: &'a Pubkey
) -> [&'a [u8]; 4] {
    [&ticket_type.as_bytes(), registrar.as_ref(), owner.as_ref(), nft_mint.as_ref()]
}

pub fn get_nft_vote_ticket_address(
    ticket_type: &str,
    registrar: &Pubkey,
    owner: &Pubkey,
    nft_mint: &Pubkey
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &get_nft_vote_ticket_seeds(ticket_type, registrar, owner, nft_mint),
        &crate::id()
    )
}

pub fn get_nft_vote_ticket_data(nft_vote_ticket_info: &AccountInfo) -> Result<NftVoteTicket> {
    Ok(get_account_data::<NftVoteTicket>(&crate::id(), nft_vote_ticket_info)?)
}