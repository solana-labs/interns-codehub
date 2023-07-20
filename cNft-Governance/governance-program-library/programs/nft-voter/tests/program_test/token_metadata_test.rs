use std::{ fmt::Display, str::FromStr, sync::Arc, convert::TryFrom };
// use anchor_lang::prelude::Pubkey;
use mpl_bubblegum;
use mpl_bubblegum::state::leaf_schema::LeafSchema;
use mpl_bubblegum::state::metaplex_adapter::{
    Collection as CNFT_Collection,
    Creator,
    MetadataArgs,
    TokenProgramVersion,
    TokenStandard,
};
use mpl_bubblegum::utils::get_asset_id;
use mpl_bubblegum::{ hash_creators, hash_metadata };
use mpl_token_metadata::state::{ Collection, CollectionDetails };
use solana_program::instruction::Instruction;
use solana_program::pubkey::Pubkey;
use solana_program::system_program;
use solana_program_test::ProgramTest;
use solana_sdk::signature::Keypair;
use solana_sdk::{ signer::Signer, transport::TransportError };

use crate::program_test::merkle_tree_test::{ LeafArgs, MerkleTreeCookie };
use crate::program_test::program_test_bench::{ MintCookie, ProgramTestBench, WalletCookie };
use crate::program_test::tools::clone_keypair;

pub struct NftCookie {
    pub address: Pubkey,
    pub metadata: Pubkey,
    pub mint_cookie: MintCookie,
}

pub struct NftCollectionCookie {
    pub mint: Pubkey,
    pub metadata: Pubkey,
    pub master_edition: Pubkey,
    pub mint_authority: Option<Keypair>,
}

pub struct CreateNftArgs {
    pub verify_collection: bool,
    pub amount: u64,
}

impl Default for CreateNftArgs {
    fn default() -> Self {
        Self {
            verify_collection: true,
            amount: 1,
        }
    }
}

pub struct TokenMetadataTest {
    pub bench: Arc<ProgramTestBench>,
    pub program_id: Pubkey,
}

impl TokenMetadataTest {
    pub fn program_id() -> Pubkey {
        Pubkey::from_str("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").unwrap()
    }

    #[allow(dead_code)]
    pub fn add_program(program_test: &mut ProgramTest) {
        program_test.add_program("mpl_token_metadata", Self::program_id(), None);
    }

    #[allow(dead_code)]
    pub fn new(bench: Arc<ProgramTestBench>) -> Self {
        TokenMetadataTest {
            bench,
            program_id: Self::program_id(),
        }
    }

    #[allow(dead_code)]
    pub async fn with_nft_collection(
        &self,
        collection_size: Option<u64>
    ) -> Result<NftCollectionCookie, TransportError> {
        let update_authority = self.bench.context.borrow().payer.pubkey();
        let payer = self.bench.context.borrow().payer.pubkey();

        // Create collection
        let coll_mint_cookie = self.bench.with_mint().await?;
        self.bench.with_tokens(&coll_mint_cookie, &update_authority, 1).await?;

        let coll_metadata_seeds = &[
            b"metadata".as_ref(),
            self.program_id.as_ref(),
            &coll_mint_cookie.address.as_ref(),
        ];
        let (coll_metadata_key, _) = Pubkey::find_program_address(
            coll_metadata_seeds,
            &self.program_id
        );

        let coll_name = "NFT_C".to_string();
        let coll_symbol = "NFT_C".to_string();
        let coll_uri = "URI".to_string();

        let mut coll_details: Option<CollectionDetails> = None;
        if let Some(collection_size) = collection_size {
            coll_details = Some(CollectionDetails::V1 {
                size: collection_size,
            });
        }

        let create_coll_metadata_ix = mpl_token_metadata::instruction::create_metadata_accounts_v3(
            self.program_id,
            coll_metadata_key,
            coll_mint_cookie.address,
            coll_mint_cookie.mint_authority.pubkey(),
            payer.clone(),
            update_authority.clone(),
            coll_name,
            coll_symbol,
            coll_uri,
            None,
            10,
            false,
            false,
            None,
            None,
            coll_details
        );

        self.bench.process_transaction(
            &[create_coll_metadata_ix],
            Some(&[&coll_mint_cookie.mint_authority])
        ).await?;

        let master_edition_seeds = &[
            b"metadata".as_ref(),
            self.program_id.as_ref(),
            coll_mint_cookie.address.as_ref(),
            b"edition".as_ref(),
        ];
        let (master_edition_key, _) = Pubkey::find_program_address(
            master_edition_seeds,
            &self.program_id
        );

        let create_master_edition_ix = mpl_token_metadata::instruction::create_master_edition_v3(
            self.program_id,
            master_edition_key,
            coll_mint_cookie.address,
            update_authority,
            coll_mint_cookie.mint_authority.pubkey(),
            coll_metadata_key,
            payer,
            Some(0)
        );

        self.bench.process_transaction(
            &[create_master_edition_ix],
            Some(&[&coll_mint_cookie.mint_authority])
        ).await?;

        Ok(NftCollectionCookie {
            mint: coll_mint_cookie.address,
            metadata: coll_metadata_key,
            master_edition: master_edition_key,
            mint_authority: None,
        })
    }

    #[allow(dead_code)]
    pub async fn with_nft_v2(
        &self,
        nft_collection_cookie: &NftCollectionCookie,
        nft_owner_cookie: &WalletCookie,
        args: Option<CreateNftArgs>
    ) -> Result<NftCookie, TransportError> {
        let CreateNftArgs { verify_collection, amount } = args.unwrap_or_default();

        // Crate NFT
        let mint_cookie = self.bench.with_mint().await?;
        let nft_account_cookie = self.bench.with_tokens(
            &mint_cookie,
            &nft_owner_cookie.address,
            amount
        ).await?;

        let metadata_seeds = &[
            b"metadata".as_ref(),
            self.program_id.as_ref(),
            &mint_cookie.address.as_ref(),
        ];
        let (metadata_key, _) = Pubkey::find_program_address(metadata_seeds, &self.program_id);

        let name = "TestNFT".to_string();
        let symbol = "NFT".to_string();
        let uri = "URI".to_string();

        let collection = Collection {
            verified: false,
            key: nft_collection_cookie.mint,
        };

        let create_metadata_ix = mpl_token_metadata::instruction::create_metadata_accounts_v3(
            self.program_id,
            metadata_key,
            mint_cookie.address,
            mint_cookie.mint_authority.pubkey(),
            self.bench.payer.pubkey(),
            self.bench.payer.pubkey(),
            name,
            symbol,
            uri,
            None,
            10,
            false,
            false,
            Some(collection),
            None,
            None
        );

        self.bench.process_transaction(
            &[create_metadata_ix],
            Some(&[&mint_cookie.mint_authority])
        ).await?;

        if verify_collection {
            let verify_collection = mpl_token_metadata::instruction::verify_sized_collection_item(
                self.program_id,
                metadata_key,
                self.bench.payer.pubkey(),
                self.bench.payer.pubkey(),
                nft_collection_cookie.mint,
                nft_collection_cookie.metadata,
                nft_collection_cookie.master_edition,
                None
            );

            self.bench.process_transaction(&[verify_collection], None).await?;
        }

        Ok(NftCookie {
            address: nft_account_cookie.address,
            metadata: metadata_key,
            mint_cookie,
        })
    }

    #[allow(dead_code)]
    pub fn default_cnft_metadata<T, U, V>(
        &self,
        name: T,
        symbol: U,
        uri: V,
        collection_mint: &Pubkey
    )
        -> MetadataArgs
        where T: Display, U: Display, V: Display
    {
        MetadataArgs {
            name: name.to_string(),
            symbol: symbol.to_string(),
            uri: uri.to_string(),
            seller_fee_basis_points: 100,
            primary_sale_happened: false,
            is_mutable: false,
            edition_nonce: None,
            token_standard: Some(TokenStandard::NonFungible),
            token_program_version: TokenProgramVersion::Original,
            collection: Some(CNFT_Collection {
                verified: false,
                key: collection_mint.clone(),
            }),
            uses: None,
            creators: vec![Creator {
                address: self.bench.payer.pubkey(),
                verified: true,
                share: 100,
            }],
        }
    }

    #[allow(dead_code)]
    pub async fn with_compressed_nft(
        &self,
        nft_collection_cookie: &NftCollectionCookie,
        tree_cookie: &mut MerkleTreeCookie,
        voter_cookie: &WalletCookie
    ) -> Result<LeafArgs, TransportError> {
        let owner = &voter_cookie.signer;

        let name = format!("test{}", tree_cookie.num_minted);
        let symbol = format!("tst{}", tree_cookie.num_minted);
        let uri = "https://www.bubblegum-nfts.com/".to_owned();
        let metadata = self.default_cnft_metadata(name, symbol, uri, &nft_collection_cookie.mint);
        let mut args = LeafArgs::new(owner, &tree_cookie.address, metadata);

        args.index = u32::try_from(tree_cookie.num_minted).unwrap();
        args.nonce = tree_cookie.num_minted;

        let accounts = mpl_bubblegum::accounts::MintV1 {
            tree_authority: tree_cookie.tree_authority,
            tree_delegate: tree_cookie.tree_delegate.pubkey(),
            payer: args.owner.pubkey(),
            log_wrapper: spl_noop::id(),
            compression_program: spl_account_compression::id(),
            leaf_owner: args.owner.pubkey(),
            leaf_delegate: args.delegate.pubkey(),
            merkle_tree: tree_cookie.address,
            system_program: system_program::id(),
        };

        let data = anchor_lang::InstructionData::data(
            &(mpl_bubblegum::instruction::MintV1 {
                message: args.metadata.clone(),
            })
        );

        let mint_cnft_ix = Instruction {
            program_id: mpl_bubblegum::id(),
            accounts: anchor_lang::ToAccountMetas::to_account_metas(&accounts, None),
            data,
        };

        let owner = clone_keypair(&args.owner);
        let signers = &[&tree_cookie.tree_delegate, &owner];
        self.bench.process_transaction(&[mint_cnft_ix], Some(signers)).await?;

        let data_hash = hash_metadata(&args.metadata).unwrap();
        let creator_hash = hash_creators(&args.metadata.creators.as_slice()).unwrap();
        let asset_id = get_asset_id(&tree_cookie.address, args.nonce);

        let leaf_node = LeafSchema::new_v0(
            asset_id,
            args.owner.pubkey(),
            args.delegate.pubkey(),
            args.nonce,
            data_hash,
            creator_hash
        ).to_node();

        tree_cookie.num_minted += 1;
        tree_cookie.proof_tree.add_leaf(leaf_node, usize::try_from(args.index).unwrap());
        Ok(args)
    }

    #[allow(dead_code)]
    pub async fn with_compressed_nft_to_collection(
        &self,
        nft_collection_cookie: &NftCollectionCookie,
        tree_cookie: &mut MerkleTreeCookie,
        voter_cookie: &WalletCookie
    ) -> Result<LeafArgs, TransportError> {
        let owner = &voter_cookie.signer;

        let name = format!("test{}", tree_cookie.num_minted);
        let symbol = format!("tst{}", tree_cookie.num_minted);
        let uri = "https://www.bubblegum-nfts.com/".to_owned();
        let metadata = self.default_cnft_metadata(name, symbol, uri, &nft_collection_cookie.mint);
        let mut args = LeafArgs::new(owner, &tree_cookie.address, metadata);

        args.index = u32::try_from(tree_cookie.num_minted).unwrap();
        args.nonce = tree_cookie.num_minted;

        // let collection_mint_authority = nft_collection_cookie.mint_authority.as_ref().unwrap();
        let collection_mint_authority = &self.bench.payer;
        let accounts = mpl_bubblegum::accounts::MintToCollectionV1 {
            tree_authority: tree_cookie.tree_authority,
            tree_delegate: tree_cookie.tree_delegate.pubkey(),
            payer: args.owner.pubkey(),
            log_wrapper: spl_noop::id(),
            compression_program: spl_account_compression::id(),
            leaf_owner: args.owner.pubkey(),
            leaf_delegate: args.delegate.pubkey(),
            merkle_tree: tree_cookie.address,
            system_program: system_program::id(),
            collection_mint: nft_collection_cookie.mint,
            collection_authority: collection_mint_authority.pubkey(),
            collection_authority_record_pda: mpl_bubblegum::id(),
            collection_metadata: nft_collection_cookie.metadata,
            edition_account: nft_collection_cookie.master_edition,
            bubblegum_signer: self.get_bubblegum_signer_address(),
            token_metadata_program: self.program_id,
        };

        let data = anchor_lang::InstructionData::data(
            &(mpl_bubblegum::instruction::MintToCollectionV1 {
                metadata_args: args.metadata.clone(),
            })
        );

        let mint_cnft_ix = Instruction {
            program_id: mpl_bubblegum::id(),
            accounts: anchor_lang::ToAccountMetas::to_account_metas(&accounts, None),
            data,
        };

        let owner = clone_keypair(&args.owner);
        let signers = &[&tree_cookie.tree_delegate, &owner, &collection_mint_authority];
        self.bench.process_transaction(&[mint_cnft_ix], Some(signers)).await?;

        if let Some(collection) = args.metadata.collection.as_mut() {
            collection.verified = true;
        }

        let data_hash = hash_metadata(&args.metadata).unwrap();
        let creator_hash = hash_creators(&args.metadata.creators.as_slice()).unwrap();
        let asset_id = get_asset_id(&tree_cookie.address, args.nonce);

        let leaf_node = LeafSchema::new_v0(
            asset_id,
            args.owner.pubkey(),
            args.delegate.pubkey(),
            args.nonce,
            data_hash,
            creator_hash
        ).to_node();

        tree_cookie.num_minted += 1;
        tree_cookie.proof_tree.add_leaf(leaf_node, usize::try_from(args.index).unwrap());
        Ok(args)
    }

    #[allow(dead_code)]
    pub fn get_bubblegum_signer_address(&self) -> Pubkey {
        Pubkey::find_program_address(&[b"collection_cpi".as_ref()], &mpl_bubblegum::id()).0
    }
}
