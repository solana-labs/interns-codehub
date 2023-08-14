use anchor_lang::prelude::*;
use crate::error::ParallelTreeError;
use spl_account_compression::{ self, ConcurrentMerkleTree };
use spl_account_compression::state::CONCURRENT_MERKLE_TREE_HEADER_SIZE_V1;
use std::cmp::max;
use std::mem::size_of;

#[account]
#[derive(Debug, PartialEq)]
pub struct ParallelTree {}

impl ParallelTree {
    pub fn get_space(max_depth: u32, max_buffer_size: u32, canopy_depth: u32) -> usize {
        // The additional 2 bytes are needed for
        // - the account disciminant  (1 byte)
        // - the header version       (1 byte)
        let merkle_tree_size = merkle_tree_get_size(
            max_depth as usize,
            max_buffer_size as usize
        ).unwrap();
        let canopy_size = max(((1 << (canopy_depth + 1)) - 2) * 32, 0);
        let size =
            CONCURRENT_MERKLE_TREE_HEADER_SIZE_V1 + merkle_tree_size + (canopy_size as usize);
        size
    }
}

pub fn get_parallel_tree_seeds<'a>(merkle_tree: &'a Pubkey) -> [&'a [u8]; 2] {
    [b"spl-governance", merkle_tree.as_ref()]
}

pub fn get_parallel_tree_address(merkle_tree: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&get_parallel_tree_seeds(merkle_tree), &crate::id()).0
}

pub fn get_authority_seeds<'a>(merkle_tree: &'a Pubkey) -> [&'a [u8]; 1] {
    [merkle_tree.as_ref()]
}

pub fn get_authority_address(merkle_tree: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&get_authority_seeds(merkle_tree), &crate::id()).0
}

pub fn merkle_tree_get_size(max_depth: usize, max_buffer_size: usize) -> Result<usize> {
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
            err!(ParallelTreeError::ConcurrentMerkleTreeConstantsError)
        }
    }
}

pub const TREE_AUTHORITY_SIZE: usize = 32 + 32 + 8 + 8 + 1 + 15; // 15 bytes padding

#[account]
#[derive(Copy, Debug, PartialEq, Eq)]
pub struct TreeConfig {
    pub tree_creator: Pubkey,
    pub tree_delegate: Pubkey,
    pub total_mint_capacity: u64,
    pub num_minted: u64,
    pub is_public: bool,
}

impl TreeConfig {
    pub fn increment_mint_count(&mut self) {
        self.num_minted = self.num_minted.saturating_add(1);
    }

    pub fn contains_mint_capacity(&self, requested_capacity: u64) -> bool {
        let remaining_mints = self.total_mint_capacity.saturating_sub(self.num_minted);
        requested_capacity <= remaining_mints
    }
}
