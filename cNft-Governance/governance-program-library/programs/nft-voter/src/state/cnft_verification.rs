// use crate::error::CompressedNftVoterError;
use anchor_lang::prelude::*;
use mpl_bubblegum::{ hash_metadata, hash_creators };
use mpl_bubblegum::state::leaf_schema::LeafSchema;
use mpl_bubblegum::state::metaplex_adapter::{ MetadataArgs, TokenProgramVersion, TokenStandard };
use mpl_bubblegum::state::metaplex_adapter::{
    Creator as MetaplexCreator,
    Collection as MetaplexCollection,
};
// use spl_account_compression::AccountCompressionError;
use spl_account_compression::cpi::accounts::VerifyLeaf;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub struct Collection {
    pub verified: bool,
    pub key: Pubkey,
}

impl Default for Collection {
    fn default() -> Self {
        Self {
            verified: false,
            key: Pubkey::default(),
        }
    }
}

impl Collection {
    pub fn to_bubblegum(&self) -> MetaplexCollection {
        MetaplexCollection {
            verified: self.verified,
            key: self.key,
        }
    }

    pub fn from_bubblegum(collection: &MetaplexCollection) -> Self {
        Self {
            verified: collection.verified,
            key: collection.key,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    pub share: u8,
}

impl Default for Creator {
    fn default() -> Self {
        Self {
            address: Pubkey::default(),
            verified: false,
            share: 0,
        }
    }
}

impl Creator {
    pub fn to_bubblegum(&self) -> MetaplexCreator {
        MetaplexCreator {
            address: self.address,
            verified: self.verified,
            share: self.share,
        }
    }

    pub fn from_bubblegum(creator: &MetaplexCreator) -> Self {
        Self {
            address: creator.address,
            verified: creator.verified,
            share: creator.share,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub struct CompressedNftAsset {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub collection: Option<Collection>,
    pub seller_fee_basis_points: u16,
    pub primary_sale_happened: bool,
    pub is_mutable: bool,
    pub edition_nonce: Option<u8>,
    pub creators: Vec<Creator>,
    pub root: [u8; 32],
    pub leaf_delegate: Pubkey,
    pub index: u32,
    pub nonce: u64,
    pub proof_len: u8,
}

impl CompressedNftAsset {
    pub fn to_metadata_args(&self) -> MetadataArgs {
        let mut creators = vec![];
        for creator in self.creators.clone().iter() {
            creators.push(creator.to_bubblegum());
        }
        MetadataArgs {
            name: self.name.clone(),
            symbol: self.symbol.clone(),
            uri: self.uri.clone(),
            seller_fee_basis_points: self.seller_fee_basis_points,
            creators,
            primary_sale_happened: self.primary_sale_happened,
            is_mutable: self.is_mutable,
            edition_nonce: self.edition_nonce,
            collection: Some(self.collection.clone().unwrap_or_default().to_bubblegum()),
            uses: None,
            token_program_version: TokenProgramVersion::Original,
            token_standard: Some(TokenStandard::NonFungible),
        }
    }
}

pub fn verify_compressed_nft<'info>(
    tree_account: &AccountInfo<'info>,
    asset_id: &Pubkey,
    leaf_owner: &Pubkey,
    params: &CompressedNftAsset,
    proofs: Vec<AccountInfo<'info>>,
    compression_program: &AccountInfo<'info>
) -> Result<()> {
    let root = &params.root;
    let leaf_delegate = &params.leaf_delegate;
    let nonce = params.nonce;
    let index = params.index;

    let mut creators = vec![];
    for creator in params.creators.clone().iter() {
        creators.push(creator.to_bubblegum());
    }

    let metadata = params.to_metadata_args();
    let data_hash = hash_metadata(&metadata).unwrap();
    let creator_hash = hash_creators(&creators).unwrap();

    let leaf = LeafSchema::new_v0(
        *asset_id,
        *leaf_owner,
        *leaf_delegate,
        nonce,
        data_hash,
        creator_hash
    );

    let cpi_ctx = CpiContext::new(compression_program.clone(), VerifyLeaf {
        merkle_tree: tree_account.clone(),
    }).with_remaining_accounts(proofs);

    // require!(
    //     spl_account_compression::cpi
    //         ::verify_leaf(cpi_ctx, params.root, leaf.to_node(), params.index)
    //         .is_ok(),
    //     AccountCompressionError::ConcurrentMerkleTreeError
    // );
    spl_account_compression::cpi::verify_leaf(cpi_ctx, *root, leaf.to_node(), index)?;

    Ok(())
}
