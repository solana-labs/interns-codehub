use anchor_lang::prelude::*;
use arrayref::array_ref;
use spl_governance::tools::spl_token::assert_is_valid_spl_token_account;
use mpl_token_metadata::state::{Metadata, TokenMetadataAccount};

use crate::error::CompressedNftVoterError;

// get amount of tokens in the given account
pub fn get_spl_token_amount(token_account_info: &AccountInfo) -> Result<u64> {
    assert_is_valid_spl_token_account(token_account_info)?;

    let data = token_account_info.try_borrow_data()?;
    let amount_bytes = array_ref![data, 64, 8];

    Ok(u64::from_le_bytes(*amount_bytes))
}

pub fn get_token_metadata(account_info: &AccountInfo) -> Result<Metadata> {
    require!(*account_info.owner == mpl_token_metadata::ID, CompressedNftVoterError::InvalidAccountOwner);

    let metadata = Metadata::from_account_info(account_info)?;

    // if metadata.key != mpl_token_metadata::state::Key::MetadataV1 {
    //     return Err(NftVoterError::InvalidTokenMetadataAccount.into());
    // }

    Ok(metadata)
}

pub fn get_token_metadata_for_mint(account_info: &AccountInfo, mint: &Pubkey) -> Result<Metadata> {
    let metadata = get_token_metadata(account_info)?;

    require_eq!(
        metadata.mint,
        *mint,
        CompressedNftVoterError::TokenMetadataDoesNotMatch,
    );

    Ok(metadata)
}
