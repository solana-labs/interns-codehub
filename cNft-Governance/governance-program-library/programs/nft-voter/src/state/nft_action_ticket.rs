use anchor_lang::prelude::*;
use crate::tools::anchor::DISCRIMINATOR_SIZE;
use borsh::{ BorshDeserialize, BorshSchema, BorshSerialize };
use solana_program::program_pack::IsInitialized;
use spl_governance_tools::account::{ get_account_data, AccountMaxSize };

pub const NFT_ACTION_TICKET_SIZE: usize = DISCRIMINATOR_SIZE + 32 + 32 + 32 + 8 + 1 + 8;

/// NFT ticket indicating the given NFT can be considered as a voting power
/// The PDA of the record is ["nft-{action}-ticket",registrar,owner,nft_mint]
/// Add expiry can ensure that the ticket is only valid in a period of time.
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct NftActionTicket {
    /// sha256("account:NftActionTicket")
    pub account_discriminator: [u8; 8],

    /// NFT ticket for which registrar to use.
    pub registrar: Pubkey,

    /// The voter who owns this ticket
    pub governing_token_owner: Pubkey,

    /// The mint address of the NFT which pass verification
    pub nft_mint: Pubkey,

    /// The weight for the NFT, which is configured in the registrar's collections.
    pub weight: u64,

    /// The expiration time for the NFT, which is the created slot + 10.
    /// Is 10 a good number?
    pub expiry: Option<u64>,
}

impl NftActionTicket {
    pub fn new(
        registrar: Pubkey,
        owner: Pubkey,
        nft_mint: Pubkey,
        weight: u64,
        expiry: Option<u64>
    ) -> Self {
        Self {
            account_discriminator: NftActionTicket::ACCOUNT_DISCRIMINATOR,
            registrar,
            governing_token_owner: owner,
            nft_mint,
            weight,
            expiry,
        }
    }

    pub fn get_weight(&self) -> u64 {
        self.weight
    }
}

impl NftActionTicket {
    /// sha256("account:NftActionTicket")
    /// python:
    /// from hashlib import sha256
    /// list(sha256("account:NftActionTicket".encode()).digest())[:8]
    pub const ACCOUNT_DISCRIMINATOR: [u8; 8] = [170, 179, 4, 130, 24, 148, 185, 97];
}

impl AccountMaxSize for NftActionTicket {}

impl IsInitialized for NftActionTicket {
    fn is_initialized(&self) -> bool {
        self.account_discriminator == NftActionTicket::ACCOUNT_DISCRIMINATOR
    }
}

/// ticket_type = format!("nft-{}-ticket", &voter_weight_action).to_string();
pub fn get_nft_action_ticket_seeds<'a>(
    ticket_type: &'a str,
    registrar: &'a Pubkey,
    owner: &'a Pubkey,
    nft_mint: &'a Pubkey
) -> [&'a [u8]; 4] {
    [&ticket_type.as_bytes(), registrar.as_ref(), owner.as_ref(), nft_mint.as_ref()]
}

pub fn get_nft_action_ticket_address(
    ticket_type: &str,
    registrar: &Pubkey,
    owner: &Pubkey,
    nft_mint: &Pubkey
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &get_nft_action_ticket_seeds(ticket_type, registrar, owner, nft_mint),
        &crate::id()
    )
}

pub fn get_nft_action_ticket_data(nft_vote_ticket_info: &AccountInfo) -> Result<NftActionTicket> {
    Ok(get_account_data::<NftActionTicket>(&crate::id(), nft_vote_ticket_info)?)
}
