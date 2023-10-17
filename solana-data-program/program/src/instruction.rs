use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankInstruction;

use crate::state::{
    CloseDataAccountArgs, FinalizeDataAccountArgs, InitializeDataAccountArgs,
    UpdateDataAccountArgs, UpdateDataAccountAuthorityArgs,
};

/// Instructions supported by the Data program.
#[derive(BorshSerialize, BorshDeserialize, Clone, ShankInstruction)]
pub enum DataAccountInstruction {
    /// This instruction initializes a data account that is accessible by the authority.
    /// This also sets the owner of the data account to be the data program
    /// If a data account was already initialized for given user, it returns Error
    #[account(0, signer, writable, name = "feepayer", desc = "Feepayer account")]
    #[account(1, signer, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "system_program", desc = "System program")]
    InitializeDataAccount(InitializeDataAccountArgs),

    /// This instruction updates the data of the data account corresponding to the authority
    /// Allows user to specify whether the data should be committed or verified
    /// Requires data account to be initialized previously
    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "system_program", desc = "System program")]
    UpdateDataAccount(UpdateDataAccountArgs),

    /// This instruction updates the authority of the data account
    /// Requires data account to be initialized previously
    #[account(0, signer, name = "old_authority", desc = "Old Authority")]
    #[account(1, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, signer, name = "new_authority", desc = "New Authority")]
    UpdateDataAccountAuthority(UpdateDataAccountAuthorityArgs),

    /// This instruction finalizes the data and metadata of the data account
    /// Requires data account to be initialized previously
    #[account(0, signer, name = "authority", desc = "Authority account")]
    #[account(1, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    FinalizeDataAccount(FinalizeDataAccountArgs),

    /// This instruction unlinks the data account corresponding to the authority
    /// Requires data account to be initialized previously
    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    CloseDataAccount(CloseDataAccountArgs),
}
