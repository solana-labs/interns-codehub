use crate::{ error::CompressedNftVoterError, id, state::*, utils::constant::DISCRIMINATOR_SIZE };
use anchor_lang::prelude::*;
use mpl_bubblegum::utils::get_asset_id;
use solana_program::pubkey::PUBKEY_BYTES;
use spl_governance::state::token_owner_record;

// Registrar which store cNFT voting configuration for the given Realm.
#[account]
#[derive(Debug, PartialEq)]
pub struct Registrar {
    /// spl-governance program id the Reamls belongs to
    pub governance_program_id: Pubkey,

    /// Realm of the Registrar
    pub realm: Pubkey,

    /// Governing token mint the Registrar is for
    /// It can either be the Community or the Council mint of the Realm
    /// When the plugin is used the mint is only used as identity of the governing power (voting population)
    /// and the actual token of the mint is not used
    pub governing_token_mint: Pubkey,

    // MPL collection used for voting
    pub collection_configs: Vec<CollectionConfig>,

    pub reserved: [u8; 128],
}

impl Registrar {
    pub fn get_space(max_collections: u8) -> usize {
        DISCRIMINATOR_SIZE +
            PUBKEY_BYTES * 3 +
            4 +
            (max_collections as usize) * (PUBKEY_BYTES + 4 + 8 + 8) +
            128
        // discriminator di + (3 pubkeys) + 4 bytes(Vec)) + max_collections * (pubkey + 4 bytes + 8 bytes + 8 bytes) + reserved
    }

    pub fn get_collection_config(&self, collection: Pubkey) -> Result<&CollectionConfig> {
        // using a Result to wrap the return value, its because the return value might be error
        self.collection_configs
            .iter()
            .find(|c| c.collection == collection)
            .ok_or_else(|| CompressedNftVoterError::CollectionNotFound.into())
    }
}

// test if this work
pub fn get_registrar_address(realm: &Pubkey, governing_token_mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"registrar", realm.as_ref(), governing_token_mint.as_ref()],
        &id()
    ).0
}

pub fn resolve_governing_token_owner(
    registrar: &Registrar,
    voter_token_owner_record_info: &AccountInfo,
    voter_authority_info: &AccountInfo,
    voter_weight_record: &VoterWeightRecord
) -> Result<Pubkey> {
    let voter_token_owner_record =
        token_owner_record::get_token_owner_record_data_for_realm_and_governing_mint(
            &registrar.governance_program_id,
            voter_token_owner_record_info,
            &registrar.realm,
            &registrar.governing_token_mint
        )?;

    voter_token_owner_record.assert_token_owner_or_delegate_is_signer(voter_authority_info)?;

    require_eq!(
        voter_token_owner_record.governing_token_owner,
        voter_weight_record.governing_token_owner,
        CompressedNftVoterError::InvalidTokenOwnerForVoterWeightRecord
    );

    Ok(voter_token_owner_record.governing_token_owner)
}

pub fn resolve_cnft_vote_weight<'info>(
    registrar: &Registrar,
    governing_token_owner: &Pubkey,
    tree_account: &AccountInfo<'info>,
    unique_asset_ids: &mut Vec<Pubkey>,
    leaf_owner: &AccountInfo<'info>,
    params: &CompressedNftAsset,
    proofs: Vec<AccountInfo<'info>>,
    compression_program: &AccountInfo<'info>
) -> Result<(u64, Pubkey)> {
    let asset_id = get_asset_id(&tree_account.key(), params.nonce);

    require_eq!(
        *governing_token_owner,
        leaf_owner.key(),
        CompressedNftVoterError::VoterDoesNotOwnNft
    );

    let collection = params.collection
        .as_ref()
        .ok_or(CompressedNftVoterError::MissingMetadataCollection)?;

    require!(collection.verified, CompressedNftVoterError::CollectionMustBeVerified);

    verify_compressed_nft(
        tree_account,
        &asset_id,
        &leaf_owner.key(),
        params,
        proofs,
        compression_program
    )?;

    if unique_asset_ids.contains(&asset_id) {
        return Err(CompressedNftVoterError::DuplicatedNftDetected.into());
    }
    unique_asset_ids.push(asset_id);

    let collection_config = registrar.get_collection_config(collection.key)?;
    Ok((collection_config.weight, asset_id))
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_get_space() {
        // Arrange
        let expected_space = Registrar::get_space(3);

        let registrar = Registrar {
            governance_program_id: Pubkey::default(),
            realm: Pubkey::default(),
            governing_token_mint: Pubkey::default(),
            collection_configs: vec![
                CollectionConfig::default(),
                CollectionConfig::default(),
                CollectionConfig::default()
            ],
            reserved: [0; 128],
        };

        // Act
        let actual_space = DISCRIMINATOR_SIZE + registrar.try_to_vec().unwrap().len();

        // Assert
        assert_eq!(expected_space, actual_space);
    }
}
