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
pub struct CompressedNftVoteRecord {
    pub account_discriminator: [u8; 8],

    pub proposal: Pubkey,
    pub asset_id: Pubkey,

    pub governing_token_owner: Pubkey,

    pub reserved: [u8; 8],
}

impl CompressedNftVoteRecord {
    /// sha256("account:CompressedNftVoteRecord")
    pub const ACCOUNT_DISCRIMINATOR: [u8; 8] = [78, 251, 13, 96, 198, 207, 234, 216];
}

impl AccountMaxSize for CompressedNftVoteRecord {}

impl IsInitialized for CompressedNftVoteRecord {
    fn is_initialized(&self) -> bool {
        self.account_discriminator == CompressedNftVoteRecord::ACCOUNT_DISCRIMINATOR
    }
}

pub fn get_cnft_vote_record_address(proposal: &Pubkey, asset_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"cnft-vote-record", proposal.as_ref(), asset_id.as_ref()],
        &id(),
    )
    .0
}

pub fn get_cnft_vote_record_data(
    cnft_vote_record_info: &AccountInfo,
) -> Result<CompressedNftVoteRecord> {
    Ok(get_account_data::<CompressedNftVoteRecord>(
        &id(),
        cnft_vote_record_info,
    )?)
}

pub fn get_cnft_vote_record_data_for_proposal_and_token_owner(
    cnft_vote_record_info: &AccountInfo,
    proposal: &Pubkey,
    governing_token_owner: &Pubkey,
) -> Result<CompressedNftVoteRecord> {
    let cnft_vote_record_data = get_cnft_vote_record_data(cnft_vote_record_info)?;

    require!(
        cnft_vote_record_data.proposal == *proposal,
        CompressedNftVoterError::InvalidProposalForNftVoteRecord
    );

    require!(
        cnft_vote_record_data.governing_token_owner == *governing_token_owner,
        CompressedNftVoterError::InvalidTokenOwnerForNftVoteRecord
    );

    Ok(cnft_vote_record_data)
}
