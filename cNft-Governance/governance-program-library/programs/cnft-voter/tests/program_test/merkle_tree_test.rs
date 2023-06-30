use std::mem::size_of;
use std::{str::FromStr, sync::Arc};
use anchor_lang::err;
use anchor_lang::error::Error;
use anchor_lang::prelude::Pubkey;
use mpl_bubblegum::state::TreeConfig;
use mpl_bubblegum::state::leaf_schema::LeafSchema;
use solana_program::instruction::{Instruction, AccountMeta};
use solana_program::{system_program, msg, system_instruction};
use solana_program_test::ProgramTest;
use solana_sdk::{
    signer::Signer, 
    transport::TransportError,
    signature::Keypair,
};
use crate::program_test::program_test_bench::ProgramTestBench;
use crate::program_test::tools::clone_keypair;
use mpl_bubblegum::state::metaplex_adapter::MetadataArgs;
use mpl_bubblegum::{hash_metadata, hash_creators};
use mpl_bubblegum::utils::get_asset_id;
use spl_merkle_tree_reference::{MerkleTree, Node};
use spl_account_compression::{ConcurrentMerkleTree, AccountCompressionError};
use spl_account_compression::state::CONCURRENT_MERKLE_TREE_HEADER_SIZE_V1;
use bytemuck::try_from_bytes;

pub fn merkle_tree_get_size(max_depth: usize, max_buffer_size: usize) -> Result<usize, Error> {
    // Note: max_buffer_size MUST be a power of 2
    match (max_depth, max_buffer_size) {
        (3, 8) => Ok(size_of::<ConcurrentMerkleTree<3, 8>>()),
        (5, 8) => Ok(size_of::<ConcurrentMerkleTree<5, 8>>()),
        (14, 64) => Ok(size_of::<ConcurrentMerkleTree<14, 64>>()),
        (14, 256) => Ok(size_of::<ConcurrentMerkleTree<14, 256>>()),
        (14, 1024) => Ok(size_of::<ConcurrentMerkleTree<14, 1024>>()),
        (14, 2048) => Ok(size_of::<ConcurrentMerkleTree<14, 2048>>()),
        (15, 64) => Ok(size_of::<ConcurrentMerkleTree<15, 64>>()),
        (16, 64) => Ok(size_of::<ConcurrentMerkleTree<16, 64>>()),
        (17, 64) => Ok(size_of::<ConcurrentMerkleTree<17, 64>>()),
        (18, 64) => Ok(size_of::<ConcurrentMerkleTree<18, 64>>()),
        (19, 64) => Ok(size_of::<ConcurrentMerkleTree<19, 64>>()),
        (20, 64) => Ok(size_of::<ConcurrentMerkleTree<20, 64>>()),
        (20, 256) => Ok(size_of::<ConcurrentMerkleTree<20, 256>>()),
        (20, 1024) => Ok(size_of::<ConcurrentMerkleTree<20, 1024>>()),
        (20, 2048) => Ok(size_of::<ConcurrentMerkleTree<20, 2048>>()),
        (24, 64) => Ok(size_of::<ConcurrentMerkleTree<24, 64>>()),
        (24, 256) => Ok(size_of::<ConcurrentMerkleTree<24, 256>>()),
        (24, 512) => Ok(size_of::<ConcurrentMerkleTree<24, 512>>()),
        (24, 1024) => Ok(size_of::<ConcurrentMerkleTree<24, 1024>>()),
        (24, 2048) => Ok(size_of::<ConcurrentMerkleTree<24, 2048>>()),
        (26, 512) => Ok(size_of::<ConcurrentMerkleTree<26, 512>>()),
        (26, 1024) => Ok(size_of::<ConcurrentMerkleTree<26, 1024>>()),
        (26, 2048) => Ok(size_of::<ConcurrentMerkleTree<26, 2048>>()),
        (30, 512) => Ok(size_of::<ConcurrentMerkleTree<30, 512>>()),
        (30, 1024) => Ok(size_of::<ConcurrentMerkleTree<30, 1024>>()),
        (30, 2048) => Ok(size_of::<ConcurrentMerkleTree<30, 2048>>()),
        _ => {
            msg!(
                "Failed to get size of max depth {} and max buffer size {}",
                max_depth,
                max_buffer_size
            );
            err!(AccountCompressionError::ConcurrentMerkleTreeConstantsError)
        }
    }
}

pub struct MerkleTreeArgs {
    max_depth: u32,
    max_buffer_size: u32,
    public: Option<bool>,
}

pub struct MerkleTreeCookie {
    pub address: Pubkey,
    pub tree_authority: Pubkey,
    pub tree_delegate: Keypair,
    pub tree_creator: Keypair,
    pub canopy_depth: u32,
    pub proof_tree: MerkleTree,
    pub num_minted: u64,
    pub args: Option<MerkleTreeArgs>,
}

impl Default for MerkleTreeArgs {
    fn default() -> Self {
        Self {
            max_depth: 5,
            max_buffer_size: 8,
            public: Some(false),
        }
    }
}

// #[derive(Default)]
pub struct LeafVerificationCookie {
    pub root: [u8; 32],
    pub data_hash: [u8; 32],
    pub creator_hash: [u8; 32],
    pub nonce: u64,
    pub index: u32,
    pub message: MetadataArgs,
    pub proofs: Vec<AccountMeta>
}

pub struct MerkleTreeTest {
    pub bench: Arc<ProgramTestBench>,
    pub program_id: Pubkey,
}

impl MerkleTreeTest {
    pub fn program_id() -> Pubkey {
        Pubkey::from_str("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY").unwrap()
    }

    #[allow(dead_code)]
    pub fn add_program(program_test: &mut ProgramTest) {
        program_test.add_program("mpl_bubblegum", Self::program_id(), None);
        program_test.add_program("spl_noop", spl_noop::id(), None);
        program_test.add_program("spl_account_compression", spl_account_compression::id(), None);
    }

    #[allow(dead_code)]
    pub fn new(bench: Arc<ProgramTestBench>) -> Self {
        MerkleTreeTest {
            bench,
            program_id: Self::program_id(),
        }
    }

    #[allow(dead_code)]
    pub async fn with_tree_alloc(
        &self,
        max_depth: usize, 
        max_buffer_size: usize, 
        merkle_tree: &Keypair, 
        payer: &Keypair,
    ) -> Result<(), TransportError> {
        let merkle_tree_size = self.merkle_tree_account_size(max_depth, max_buffer_size);
        let lamports = self.bench.rent.minimum_balance(merkle_tree_size);

        let tree_alloc_ix = system_instruction::create_account(
            &payer.pubkey(), 
            &merkle_tree.pubkey(), 
            lamports, 
            u64::try_from(merkle_tree_size).unwrap(),
            &spl_account_compression::id());

        let signers = &[merkle_tree];

        self.bench.process_transaction(&[tree_alloc_ix], Some(signers)).await?;
        Ok(())
    }
    
    #[allow(dead_code)]
    pub fn merkle_tree_account_size(&self, max_depth: usize, max_buffer_size: usize) -> usize {
        CONCURRENT_MERKLE_TREE_HEADER_SIZE_V1 + merkle_tree_get_size(max_depth, max_buffer_size).unwrap()
    }

    #[allow(dead_code)]
    pub async fn with_merkle_tree(
        &self, 
        args: Option<MerkleTreeArgs>,
    ) -> Result<MerkleTreeCookie, TransportError> {
        let merkle_tree = Keypair::new();
        let tree_authority = self.get_tree_authority_address(&merkle_tree.pubkey());
        let tree_creator = clone_keypair(&self.bench.payer); //payer or random???
        let tree_delegate = clone_keypair(&tree_creator);
        let payer = &self.bench.payer;
        let args = args.unwrap_or_default();

        self.with_tree_alloc(
            args.max_depth as usize, 
            args.max_buffer_size as usize, 
            &merkle_tree, 
            &payer, 
        ).await?;
        
        let accounts = mpl_bubblegum::accounts::CreateTree {
            tree_authority: tree_authority,
            payer: payer.pubkey(),
            tree_creator: tree_creator.pubkey(),
            log_wrapper: spl_noop::id(),
            system_program: system_program::id(),
            compression_program: spl_account_compression::id(),
            merkle_tree: merkle_tree.pubkey(),
        };

        let data = anchor_lang::InstructionData::data(&mpl_bubblegum::instruction::CreateTree{
            max_depth: args.max_depth,
            max_buffer_size: args.max_buffer_size,
            public: args.public,
        });

        let create_merkle_tree_ix = Instruction {
            program_id: self.program_id,
            accounts: anchor_lang::ToAccountMetas::to_account_metas(&accounts, None),
            data
        };


        // let signers = &[payer];

        self.bench.process_transaction(
            &[create_merkle_tree_ix],
            None,
        ).await?;
        
        let proof_tree = MerkleTree::new(vec![Node::default(); 1 << args.max_depth].as_slice());
        Ok(MerkleTreeCookie { 
            address: merkle_tree.pubkey(), 
            tree_authority,
            tree_creator,
            tree_delegate, 
            canopy_depth: 0, 
            proof_tree, 
            num_minted: 0,
            args: Some(args),
        })
    }

    #[allow(dead_code)]
    pub fn get_tree_authority_address(&self, tree_pubkey: &Pubkey) -> Pubkey {
        Pubkey::find_program_address(&[tree_pubkey.as_ref()], &self.program_id).0
    }

    #[allow(dead_code)]
    pub async fn get_tree_config(&self, tree_cookie: &mut MerkleTreeCookie) -> Result<TreeConfig, TransportError> {
        let tree_authority = &tree_cookie.tree_authority;
        let tree_config = self.bench.get_anchor_account::<TreeConfig>(*tree_authority).await;
        Ok(tree_config)
    }

    #[allow(dead_code)]
    pub async fn decode_root(&self, tree_mint: &Pubkey, max_depth: usize, max_buffer_size: usize) -> Result<[u8; 32], TransportError> {
        let mut tree_account = self.bench.get_account(tree_mint).await.unwrap();

        let merkle_tree_bytes = tree_account.data.as_mut_slice();
        let(_header_bytes, rest) = merkle_tree_bytes.split_at_mut(CONCURRENT_MERKLE_TREE_HEADER_SIZE_V1);

        let merkle_tree_size = merkle_tree_get_size(max_depth, max_buffer_size).unwrap();
        let tree_bytes = &mut rest[..merkle_tree_size];

        // fixed ConcurrentMerkleTree<5, 8> for now
        let tree = try_from_bytes::<ConcurrentMerkleTree<5, 8>>(tree_bytes).unwrap();
        let root = tree.change_logs[tree.active_index as usize].root;
        Ok(root)
    }

    #[allow(dead_code)]
    pub async fn get_leaf_verification_info(&self, tree_cookie: &mut MerkleTreeCookie, args: &LeafArgs, max_depth: usize, max_buffer_size: usize) -> Result<LeafVerificationCookie, TransportError> {
        let root = self.decode_root(&tree_cookie.address, max_depth, max_buffer_size).await?;
        let data_hash = hash_metadata(&args.metadata).unwrap();
        let creator_hash = hash_creators(&args.metadata.creators.as_slice()).unwrap();

        let nodes: Vec<Node> = tree_cookie.proof_tree.get_proof_of_leaf(usize::try_from(args.index).unwrap());
        let proofs: Vec<AccountMeta> = nodes.into_iter().map(|node| AccountMeta::new_readonly(Pubkey::new_from_array(node), false)).collect();

        Ok(LeafVerificationCookie {
            root,
            data_hash,
            creator_hash,
            nonce: args.nonce,
            index: args.index,
            message: args.metadata.clone(),
            proofs
        })
    }
}

#[derive(Debug)]
pub struct LeafArgs {
    pub owner: Keypair,
    pub delegate: Keypair,
    pub metadata: MetadataArgs,
    pub nonce: u64,
    pub index: u32,
}

impl Clone for LeafArgs {
    fn clone(&self) -> Self {
        LeafArgs {
            owner: clone_keypair(&self.owner),
            delegate: clone_keypair(&self.delegate),
            metadata: self.metadata.clone(),
            nonce: self.nonce,
            index: self.index,
        }
    }
}

impl LeafArgs {
    // Creates a new object with some default values.
    pub fn new(owner: &Keypair, metadata: MetadataArgs) -> Self {
        LeafArgs {
            owner: clone_keypair(owner),
            delegate: clone_keypair(owner),
            metadata,
            nonce: 0,
            index: 0,
        }
    }
}