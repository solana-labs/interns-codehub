use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum RecoveryError {
    #[error("There are too many guardians after adding")]
    TooManyGuardians,
    #[error("The Guardian to be modified is not in the data")]
    ModifiedGuardianNotFound,
    #[error("There are too few guardians after deletion")]
    NotEnoughGuardians,
    #[error("The Guardian to be deleted is not in the data")]
    DeletedGuardianNotFound,
    #[error("Recovery Threshold must be between 1 to 10")]
    InvalidRecoveryThreshold,
    #[error("The pubkey is not authorized to recover the wallet")]
    NotAuthorizedToRecover,
    #[error("There is insufficient SOL to transfer")]
    InsufficientFundsForTransaction,
}

impl From<RecoveryError> for ProgramError {
    fn from(e: RecoveryError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
