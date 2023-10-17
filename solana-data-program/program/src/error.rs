use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum DataAccountError {
    #[error("Instruction not implemented.")]
    NotImplemented,
    #[error("Account should be writeable")]
    NotWriteable,
    #[error("Account should not have 0 length data")]
    NoAccountLength,
    #[error("Account should not have non-zero data")]
    NonZeroData,
    #[error("Account should be signer")]
    NotSigner,
    #[error("Account should be valid system program")]
    InvalidSysProgram,
    #[error("Account should be valid owner of data account")]
    InvalidAuthority,
    #[error("Account should be PDA of data account")]
    InvalidPDA,
    #[error("Cannot reinitialize previously initialized data account")]
    AlreadyInitialized,
    #[error("Data account should be initialized")]
    NotInitialized,
    #[error("Cannot update previously finalized data account")]
    AlreadyFinalized,
    #[error("Operation overflowed")]
    Overflow,
    #[error("Data account should have sufficient space")]
    InsufficientSpace,
}

impl From<DataAccountError> for ProgramError {
    fn from(e: DataAccountError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
