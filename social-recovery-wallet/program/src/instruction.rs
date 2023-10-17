use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum RecoveryInstruction {
    /// This instruction will allow a user to initialize a socially-recoverable program wallet
    ///
    /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: PDA of Recovery Program that only `authority` can write to |
    /// | 1     | ❌       | ✅     | authority: Pubkey with sole write access to `authorized_buffer`           |
    /// | 2     | ❌       | ❌     | system_program: Used to allocate the buffer                               |
    InitializeSocialWallet {
        acct_len: u8,
        recovery_threshold: u8,
    },
    /// The contents of the data vector that is provided to the instruction will be copied into the `authorized_buffer` account
    /// starting from index 9 (will NOT override the bump_seed and buffer_seed).
    ///
    /// If the remaining `authorized_buffer` account length ( N ) is smaller than the length of `data`, copy the first N bytes
    /// of data into `authorized_buffer`.
    ///
    /// Initially, if `authorized_buffer` has any non-zero data past index 9, you should should zero out all of the data outside
    /// of the first 9 bytes.
    ///
    /// If any account besides the `authority` attempts to write to the `authorized_buffer`, the instruction will fail.
    ///
    /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: PDA of Recovery Program that only `authority` can write to |
    /// | 1     | ❌       | ✅     | authority: Pubkey with sole write access to `authorized_buffer`           |
    AddToRecoveryList {
        acct_len: u8,
    },
    ModifyRecoveryList {
        acct_len: u8,
    },
    DeleteFromRecoveryList {
        acct_len: u8,
    },
    ModifyRecoveryThreshold {
        new_threshold: u8,
    },
    RecoverWallet {
        acct_len: u8,
    },
    TransferToken {
        amount: u64,
        recovery_mode: u8,
    },
    TransferNativeSOL {
        amount: u64,
        recovery_mode: u8,
    },
    WrapSignInstr {
        acct_len: u8,
        custom_data: Vec<u8>,
    },
}
