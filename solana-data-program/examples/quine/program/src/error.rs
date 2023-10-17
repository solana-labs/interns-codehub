use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum QuineError {
    #[error("Account should be writeable")]
    NotWriteable,
    #[error("Account should not have 0 length data")]
    NoAccountLength,
    #[error("Account should not have non-zero data")]
    NotSigner,
}

impl From<QuineError> for ProgramError {
    fn from(e: QuineError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
