use anchor_lang::prelude::*;
use crate::tools::anchor::DISCRIMINATOR_SIZE;
use borsh::{ BorshDeserialize, BorshSchema, BorshSerialize };
use solana_program::program_pack::IsInitialized;
use spl_governance_tools::account::{ get_account_data, AccountMaxSize };

pub const NFT_VOTE_TICKET_SIZE: usize = DISCRIMINATOR_SIZE + 32 + 8;

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct NftVoteTicket {
    pub account_discriminator: [u8; 8],
    pub nft_owner: Pubkey,
    pub weight: u64,
}

impl NftVoteTicket {
    pub fn new(nft_owner: Pubkey, weight: u64) -> Self {
        Self {
            account_discriminator: NftVoteTicket::ACCOUNT_DISCRIMINATOR,
            nft_owner: nft_owner,
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

pub fn get_nft_vote_ticket_seeds<'a>(
    ticket_type: &'a str,
    registrar: &'a Pubkey,
    nft_mint: &'a Pubkey
) -> [&'a [u8]; 3] {
    [&ticket_type.as_bytes(), registrar.as_ref(), nft_mint.as_ref()]
}

pub fn get_nft_vote_ticket_address(
    ticket_type: &str,
    registrar: &Pubkey,
    nft_mint: &Pubkey
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &get_nft_vote_ticket_seeds(ticket_type, registrar, nft_mint),
        &crate::id()
    )
}

pub fn get_nft_vote_ticket_data(nft_vote_ticket_info: &AccountInfo) -> Result<NftVoteTicket> {
    Ok(get_account_data::<NftVoteTicket>(&crate::id(), nft_vote_ticket_info)?)
}
