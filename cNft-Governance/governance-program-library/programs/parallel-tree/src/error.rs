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

    #[msg("Concurrent Authority Data Not Empty")]
    AuthorityDataNotEmpty,

    #[msg("Invalid Account Address")]
    InvalidAccountAddress,

    #[msg("Invalid Parallel Tree Creator")]
    InvalidParallelTreeCreator,

    #[msg("Unmatched Max Depth")]
    UnmatchedMaxDepth,

    #[msg("Unmatched Max Buffer Size")]
    UnmatchedMaxBufferSize,

    #[msg("Invalid Parallel Tree Public Flag")]
    InvalidParallelTreePublicFlag,

    #[msg("Invalid Seeds")]
    InvalidSeeds,
}
