use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankInstruction;

use crate::state::{
    AppendIdentityCloArgs, AppendIdentityEyesArgs, AppendIdentityMouthArgs, AppendIdentityTopArgs,
    CompleteIdentityArgs, InitializeIdentityArgs, UpdateDataAccountArgs,
};

/// Instructions supported by the Identity program.
#[derive(BorshSerialize, BorshDeserialize, Clone, ShankInstruction)]
pub enum IdentityInstruction {
    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "data_program", desc = "Data Program")]
    #[account(4, name = "system_program", desc = "System program")]
    #[account(5, name = "env", desc = "env")]
    #[account(6, name = "head", desc = "head")]
    InitializeIdentity(InitializeIdentityArgs),

    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "data_program", desc = "Data Program")]
    #[account(4, name = "system_program", desc = "System program")]
    #[account(5, name = "clo", desc = "clo")]
    #[account(6, name = "clo", desc = "clo")]
    #[account(7, name = "clo", desc = "clo")]
    #[account(8, name = "clo", desc = "clo")]
    #[account(9, name = "clo", desc = "clo")]
    #[account(10, name = "clo", desc = "clo")]
    #[account(11, name = "clo", desc = "clo")]
    AppendIdentityClo(AppendIdentityCloArgs),

    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "data_program", desc = "Data Program")]
    #[account(4, name = "system_program", desc = "System program")]
    #[account(5, name = "top", desc = "top")]
    #[account(6, name = "top", desc = "top")]
    #[account(7, name = "top", desc = "top")]
    #[account(8, name = "top", desc = "top")]
    #[account(9, name = "top", desc = "top")]
    #[account(10, name = "top", desc = "top")]
    #[account(11, name = "top", desc = "top")]
    AppendIdentityTop(AppendIdentityTopArgs),

    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "data_program", desc = "Data Program")]
    #[account(4, name = "system_program", desc = "System program")]
    #[account(5, name = "eyes", desc = "eyes")]
    #[account(6, name = "eyes", desc = "eyes")]
    #[account(7, name = "eyes", desc = "eyes")]
    #[account(8, name = "eyes", desc = "eyes")]
    #[account(9, name = "eyes", desc = "eyes")]
    #[account(10, name = "eyes", desc = "eyes")]
    #[account(11, name = "eyes", desc = "eyes")]
    AppendIdentityEyes(AppendIdentityEyesArgs),

    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "data_program", desc = "Data Program")]
    #[account(4, name = "system_program", desc = "System program")]
    #[account(5, name = "mouth", desc = "mouth")]
    #[account(6, name = "mouth", desc = "mouth")]
    #[account(7, name = "mouth", desc = "mouth")]
    #[account(8, name = "mouth", desc = "mouth")]
    #[account(9, name = "mouth", desc = "mouth")]
    #[account(10, name = "mouth", desc = "mouth")]
    #[account(11, name = "mouth", desc = "mouth")]
    AppendIdentityMouth(AppendIdentityMouthArgs),

    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "data_program", desc = "Data Program")]
    #[account(4, name = "system_program", desc = "System program")]
    CompleteIdentity(CompleteIdentityArgs),
}

/// Instructions supported by the Data program.
#[derive(BorshSerialize, BorshDeserialize, Clone, ShankInstruction)]
pub enum DataAccountInstruction {
    // This instruction initializes a data account that is accessible by the authority.
    /// This also sets the owner of the data account to be the data program
    /// If a data account was already initialized for given user, it returns Error
    InitializeDataAccount(),

    /// This instruction updates the data of the data account corresponding to the authority
    /// Allows user to specify whether the data should be committed or verified
    /// Requires data account to be initialized previously
    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, signer, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "system_program", desc = "System program")]
    UpdateDataAccount(UpdateDataAccountArgs),
}
