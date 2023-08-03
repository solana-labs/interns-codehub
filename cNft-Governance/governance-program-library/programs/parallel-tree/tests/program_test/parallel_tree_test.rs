use crate::program_test::merkle_tree_test::MerkleTreeTest;
use crate::program_test::merkle_tree_test::MerkleTreeCookie;
use crate::program_test::program_test_bench::ProgramTestBench;
use crate::program_test::program_test_bench::WalletCookie;
use crate::program_test::token_metadata_test::TokenMetadataTest;
use crate::program_test::tools::NopOverride;
use anchor_lang::prelude::Pubkey;
use borsh::BorshDeserialize;
use solana_program::system_instruction;
use solana_program_test::{ BanksClientError, ProgramTest };
use solana_sdk::instruction::Instruction;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use spl_account_compression;
use spl_account_compression::state::CONCURRENT_MERKLE_TREE_HEADER_SIZE_V1;
use spl_account_compression::state::ConcurrentMerkleTreeHeader;
use spl_merkle_tree_reference::MerkleTree;
use spl_merkle_tree_reference::Node;
use spl_parallel_tree::state::*;
use std::sync::Arc;

pub struct ParallelTreeCookie {
    pub address: Pubkey,
    pub authority: Pubkey,
    pub max_depth: u32,
    pub max_buffer_size: u32,
    pub canopy_depth: u32,
    pub proof_tree: MerkleTree,
}

pub struct ParallelTreeTest {
    pub program_id: Pubkey,
    pub bench: Arc<ProgramTestBench>,
    pub token_metadata: TokenMetadataTest,
    pub merkle_tree: MerkleTreeTest,
}

impl ParallelTreeTest {
    #[allow(dead_code)]
    pub fn add_program(program_test: &mut ProgramTest) {
        program_test.add_program("spl_parallel_tree", spl_parallel_tree::id(), None);
    }

    #[allow(dead_code)]
    pub async fn start_new() -> Self {
        let mut program_test = ProgramTest::default();

        ParallelTreeTest::add_program(&mut program_test);
        TokenMetadataTest::add_program(&mut program_test);
        MerkleTreeTest::add_program(&mut program_test);

        let program_id = spl_parallel_tree::id();

        let bench = ProgramTestBench::start_new(program_test).await;
        let bench_rc = Arc::new(bench);
        let token_metadata_bench = TokenMetadataTest::new(bench_rc.clone());
        let merkle_tree_bench = MerkleTreeTest::new(bench_rc.clone());

        Self {
            program_id,
            bench: bench_rc,
            token_metadata: token_metadata_bench,
            merkle_tree: merkle_tree_bench,
        }
    }

    #[allow(dead_code)]
    pub async fn with_create_parallel_tree(
        &mut self,
        tree_cookie: &MerkleTreeCookie,
        wallet_cookie: &WalletCookie
    ) -> Result<ParallelTreeCookie, BanksClientError> {
        self.with_create_parallel_tree_ix(tree_cookie, wallet_cookie, NopOverride, None).await
    }

    #[allow(dead_code)]
    pub async fn with_create_parallel_tree_ix<F: Fn(&mut Instruction)>(
        &mut self,
        tree_cookie: &MerkleTreeCookie,
        wallet_cookie: &WalletCookie,
        instruction_override: F,
        signers_override: Option<&[&Keypair]>
    ) -> Result<ParallelTreeCookie, BanksClientError> {
        let data = anchor_lang::InstructionData::data(
            &(spl_parallel_tree::instruction::CreateParallelTree {
                max_depth: tree_cookie.max_depth,
                max_buffer_size: tree_cookie.max_buffer_size,
                canopy_depth: tree_cookie.canopy_depth,
                public: Some(false),
            })
        );

        let parallel_tree_key = get_parallel_tree_address(&tree_cookie.address);
        let (parallel_tree_authority, bump) = Pubkey::find_program_address(
            &[parallel_tree_key.as_ref()],
            &spl_parallel_tree::id()
        );
        println!("parallel_tree_authority: {}, {}", parallel_tree_authority, bump);
        let accounts = anchor_lang::ToAccountMetas::to_account_metas(
            &(spl_parallel_tree::accounts::CreateParallelTree {
                parallel_tree_authority: parallel_tree_authority,
                parallel_tree: parallel_tree_key,
                main_tree_authority: tree_cookie.tree_authority,
                main_tree: tree_cookie.address,
                payer: self.bench.payer.pubkey(),
                tree_creator: wallet_cookie.address,
                system_program: anchor_lang::solana_program::system_program::id(),
                log_wrapper: spl_noop::id(),
                compression_program: spl_account_compression::id(),
            }),
            None
        );

        let mut create_parallel_tree_ix = Instruction {
            program_id: spl_parallel_tree::id(),
            accounts,
            data,
        };

        // create_parallel_tree_ix.accounts.push(AccountMeta::new(parallel_tree_key, false));

        instruction_override(&mut create_parallel_tree_ix);

        let default_signers = &[&wallet_cookie.signer];
        let signers = signers_override.unwrap_or(default_signers);

        self.bench.process_transaction(&[create_parallel_tree_ix], Some(signers)).await?;

        let proof_tree = MerkleTree::new(
            vec![Node::default(); 1 << tree_cookie.max_depth].as_slice()
        );

        Ok(ParallelTreeCookie {
            address: tree_cookie.address,
            authority: tree_cookie.tree_authority,
            max_depth: tree_cookie.max_depth,
            max_buffer_size: tree_cookie.max_buffer_size,
            canopy_depth: tree_cookie.canopy_depth,
            proof_tree,
        })
    }

    // #[allow(dead_code)]
    // pub async fn with_allocate_parallel_tree(
    //     &mut self,
    //     tree_cookie: &MerkleTreeCookie
    // ) -> Result<(), BanksClientError> {
    //     let parallel_tree_key = get_parallel_tree_address(&tree_cookie.address);

    //     let seed = get_parallel_tree_seeds(&tree_cookie.address);
    //     let (parallel_tree_authority, bump) = Pubkey::find_program_address(
    //         &seed,
    //         &spl_parallel_tree::id()
    //     );
    //     let mut signers_seeds = seed.to_vec();
    //     signers_seeds.push(&[bump]);

    //     let rent = self.bench.context.borrow_mut().banks_client.get_rent().await.unwrap();

    //     let create_account_instruction = system_instruction::create_account(
    //         &self.bench.context.borrow().payer.pubkey(),
    //         &parallel_tree_key,
    //         rent.minimum_balance(10),
    //         10 as u64,
    //         &spl_parallel_tree::id()
    //     );

    //     self.bench.process_transaction(&[create_account_instruction], None).await?;
    //     Ok(())
    // }

    #[allow(dead_code)]
    pub async fn get_tree_authority_account(&mut self, tree_authority: &Pubkey) -> TreeConfig {
        self.bench.get_anchor_account::<TreeConfig>(*tree_authority).await
    }

    #[allow(dead_code)]
    pub async fn get_tree_header_account(
        &mut self,
        merkle_tree: &Pubkey
    ) -> ConcurrentMerkleTreeHeader {
        let mut data = self.bench.get_account_data(*merkle_tree).await;
        let (header_bytes, _) = data
            .as_mut_slice()
            .split_at_mut(CONCURRENT_MERKLE_TREE_HEADER_SIZE_V1);
        let header = ConcurrentMerkleTreeHeader::try_from_slice(header_bytes).unwrap();
        header
    }

    #[allow(dead_code)]
    pub async fn get_tree_account(&mut self, merkle_tree: &Pubkey) -> Vec<u8> {
        let data = self.bench.get_account_data(*merkle_tree).await;
        data
    }
}
