use anchor_lang::prelude::*;

#[error_code]
pub enum ParallelTreeError {
    #[msg("Invalid Tree Size")]
    InvalidTreeSize,

    #[msg("Invalid Tree Header Version")]
    InvalidTreeHeaderVersion,
}
