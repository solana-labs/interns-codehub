use anchor_lang::prelude::*;
use crate::error::ParallelTreeError;
// use spl_concurrent_merkle_tree::state::

#[account]
#[derive(Debug, PartialEq)]
pub struct ParallelTree {
    max_size: u8,
}

impl ParallelTree {
    pub fn new(max_size: u8) -> Self {
        Self { max_size }
    }

    pub fn get_space(
        max_size: u8,
        max_buffer_size: u8,
        canopy_depth: Option<u8>,
        header_version: String
    ) -> usize {
        let mut size = 0;

        // The additional 2 bytes are needed for
        // - the account disciminant  (1 byte)
        // - the header version       (1 byte)
        size += 2 + ;
        // return (
        //     2 +
        //     concurrentMerkleTreeHeaderDataV1Beet.byteSize +
        //     concurrentMerkleTreeBeetFactory(maxDepth, maxBufferSize).byteSize +
        //     (canopyDepth ? canopyBeetFactory(canopyDepth).byteSize : 0)
        // );
        size as usize
    }
}
