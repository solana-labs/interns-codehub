use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankInstruction;

use crate::state::{TestLuckArgs, UpdateDataAccountArgs};

/// Instructions supported by the Luck program.
#[derive(BorshSerialize, BorshDeserialize, Clone, ShankInstruction)]
pub enum LuckInstruction {
    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account data")]
    #[account(2, writable, name = "pda", desc = "Data account pda")]
    #[account(3, name = "data_program", desc = "Data Program")]
    #[account(4, name = "system_program", desc = "System program")]
    TestLuck(TestLuckArgs),
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
