use crate::error::CompressedNftVoterError;
use crate::id;
use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_program::program_pack::IsInitialized;
use spl_governance_tools::account::{get_account_data, AccountMaxSize};

/// Vote record indicating the given NFT voted on the Proposal
/// The PDA of the record is ["nft-vote-record",proposal,nft_mint]
/// It guarantees uniques and ensures the same NFT can't vote twice
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct NftVoteRecord {
    pub account_discriminator: [u8; 8],

    pub proposal: Pubkey,
    pub nft_mint: Pubkey,

    pub governing_token_owner: Pubkey,

    pub reserved: [u8; 8],
}

impl NftVoteRecord {
    /// sha256("account:NftVoteRecord")[..8]
    pub const ACCOUNT_DISCRIMINATOR: [u8; 8] = [137, 6, 55, 139, 251, 126, 254, 99];
}

impl AccountMaxSize for NftVoteRecord {}

impl IsInitialized for NftVoteRecord {
    fn is_initialized(&self) -> bool {
        self.account_discriminator == NftVoteRecord::ACCOUNT_DISCRIMINATOR
    }
}

pub fn get_nft_vote_record_address(proposal: &Pubkey, nft_mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"nft-vote-record", proposal.as_ref(), nft_mint.as_ref()],
        &crate::id(),
    )
    .0
}

pub fn get_nft_vote_record_data(nft_vote_record_info: &AccountInfo) -> Result<NftVoteRecord> {
    Ok(get_account_data::<NftVoteRecord>(
        &id(),
        nft_vote_record_info,
    )?)
}

pub fn get_nft_vote_record_data_for_proposal_and_token_owner(
    nft_vote_record_info: &AccountInfo,
    proposal: &Pubkey,
    governing_token_owner: &Pubkey,
) -> Result<NftVoteRecord> {
    let nft_vote_record_data = get_nft_vote_record_data(nft_vote_record_info)?;

    require!(
        nft_vote_record_data.proposal == *proposal,
        CompressedNftVoterError::InvalidProposalForNftVoteRecord
    );

    require!(
        nft_vote_record_data.governing_token_owner == *governing_token_owner,
        CompressedNftVoterError::InvalidTokenOwnerForNftVoteRecord
    );

    Ok(nft_vote_record_data)
}
