use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum LuckError {
    #[error("Account should be writeable")]
    NotWriteable,
    #[error("Account should not have 0 length data")]
    NoAccountLength,
    #[error("Account should be signer")]
    NotSigner,
}

impl From<LuckError> for ProgramError {
    fn from(e: LuckError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
