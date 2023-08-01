use anchor_lang::prelude::*;

#[error_code]
pub enum ParallelTreeError {
    #[msg("Invalid Tree Size")]
    InvalidTreeSize,

    #[msg("Invalid Tree Header Version")]
    InvalidTreeHeaderVersion,

    #[msg("Concurrent Merkle Tree Constants Error")]
    ConcurrentMerkleTreeConstantsError,

    #[msg("Concurrent Merkle Tree Data Not Empty")]
    ConcurrentMerkleTreeDataNotEmpty,

    #[msg("Invalid Account Address")]
    InvalidAccountAddress,
}
