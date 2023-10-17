use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum SmartSendError {
    #[error("Incorrect authorized buffer.")]
    IncorrectAuthBuff,
    #[error("Not authorized.")]
    NotAuthorized,
    #[error("Overflow caused.")]
    Overflow,
    #[error("Underflow caused.")]
    Underflow,
    #[error("Outputs not matching.")]
    IncorrectOutputs,
    #[error("Not all inputs have sent.")]
    UnsentInput,
    #[error("Insufficient input amount.")]
    InsufficientInput,
    #[error("Not a matching input.")]
    IncorrectInput,
    #[error("Sum of inputs is less than sum of outputs.")]
    InsufficientInputs,
    #[error("Uninitialized inputs.")]
    UninitializedInputs,
    #[error("Uninitialized outputs.")]
    UninitializedOutputs,
    #[error("Incorrect state.")]
    IncorrectState,
}

impl From<SmartSendError> for ProgramError {
    fn from(e: SmartSendError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
