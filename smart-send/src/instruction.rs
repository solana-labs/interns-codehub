use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;



#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum SmartSendInstruction {
    /// All deposited inputs will be refunded to their accounts.
    ///
    /// Can only be called by the payer or one of the input accounts
    /// Sets the account to closed
    ///
    /// 
    ///
    /// Accounts:
    /// | index | writable | signer | description                                               |
    /// |-------|----------|--------|-----------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: Destination account of the data        |
    /// | 1     | ❌       | ✅     | fee_payer: Destination account of the data                |
    /// | 2+    | ✅       | ❌     | in: Outputs to send to, must match initialization order   |
    RefundAll { buffer_seed: u64 },
    /// This instruction will close the pda, wiping the data and taking all the lamports
    /// 
    /// Can only be called by the original fee payer
    ///
    /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: PDA of Smart Sender Program                           |
    /// | 1     | ❌       | ✅     | fee_payer: payer                                                         |
    /// | 2     | ❌       | ❌     | system_program: Used to allocate the buffer                              |
    CloseAccount {
        buffer_seed: u64
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
    /// | 0     | ✅       | ❌     | pda_account: PDA of Echo Program that only `authority` can write to       |
    /// | 1     | ❌       | ✅     | authority: Pubkey with sole write access to `authorized_buffer`           |
    /// | 2     | ❌       | ❌     | system_program: Used to transfer the funds                                |
    SmartDeposit { amount: u64, buffer_seed: u64},
    /// This instruction will allocate `buffer_size` bytes to the `vending_machine_buffer` account and assign it the Echo Program.
    ///
    /// The first 9 bytes of `vending_machine_buffer` will be set with the following data:
    ///     byte 0: bump_seed
    ///     bytes 1-8: price
    ///
    /// Accounts:
    /// | index | writable | signer | description                                                                                         |
    /// |-------|----------|--------|-----------------------------------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | pda_account: PDA of the Echo Program that only holders of a particular token can write to            |
    /// | 1     | ❌       | ✅     | payer: Pubkey that allocates the `vending_machine_buffer`                                            |
    /// | 2+    | ✅       | ❌     | out: Outputs to send to, must match initialization order                                             |
    SmartSend {
        buffer_seed: u64,
    },

    /// This instruction will initialize the `authorized_buffer` account and assign it the Smart Send Program.
    ///
    ///
    /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: PDA of Smart Sender Program                           |
    /// | 1     | ❌       | ✅     | fee_payer: payer                                                         |
    /// | 2     | ❌       | ❌     | system_program: Used to allocate the buffer                              |
    InitializeSmartSend {
        input_amount: usize,
        output_amount: usize,
        buffer_seed: u64
    },

        /// This instruction will initialize the `authorized_buffer` account and assign it the Smart Send Program.
    ///
    ///
    /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: PDA of Smart Sender Program                           |
    /// | 1     | ❌       | ✅     | fee_payer: payer                                                         |
    InitializeInputs {
        input_accs: Vec<Pubkey>,
        input_vals: Vec<u64>,
        buffer_seed: u64
    },

    /// This instruction will initialize the `authorized_buffer` account and assign it the Smart Send Program.
    ///
    ///
    /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: PDA of Smart Sender Program                           |
    /// | 1     | ❌       | ✅     | fee_payer: payer                                                         |
    InitializeOutputs {
        output_accs: Vec<Pubkey>,
        output_vals: Vec<u64>,
        buffer_seed: u64
    },

/// This instruction will initialize the `authorized_buffer` account and assign it the Smart Send Program.
    ///
    ///
    /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: PDA of Smart Sender Program                           |
    /// | 1     | ❌       | ✅     | fee_payer: payer                                                         |
    InitializeInput {
        input_acc: Pubkey,
        input_val: u64,
        buffer_seed: u64
    },

    /// This instruction will initialize the `authorized_buffer` account and assign it the Smart Send Program.
    ///
    ///
    /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: PDA of Smart Sender Program                           |
    /// | 1     | ❌       | ✅     | fee_payer: payer                                                         |
    InitializeOutput {
        output_acc: Pubkey,
        output_val: u64,
        buffer_seed: u64
    },

    /// All deposited inputs will be refunded to their accounts.
    ///
    /// Can only be called by the payer or one of the input accounts
    /// Sets the account to closed
    ///
    /// 
    ///
    /// Accounts:
    /// | index | writable | signer | description                                               |
    /// |-------|----------|--------|-----------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: Destination account of the data        |
    /// | 1     | ❌       | ✅     | fee_payer: Destination account of the data                |
    /// | 2    | ✅       | ❌      | in: Outputs to send to, must match initialization order   |
    Refund { 
        buffer_seed: u64,
        done_manually: bool
    },

    /// All deposited inputs will be refunded to their accounts.
    ///
    /// Can only be called by the payer or one of the input accounts
    /// Sets the account to closed
    ///
    /// 
    ///
    /// Accounts:
    /// | index | writable | signer | description                                               |
    /// |-------|----------|--------|-----------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: Destination account of the data        |
    /// | 1     | ❌       | ✅     | fee_payer: Destination account of the data                |
    /// | 2    | ✅       | ❌      | out: Output to send to, must match initialization order   |
    Withdraw { 
        buffer_seed: u64,
        done_manually: bool
    },

    /// Accounts:
    /// | index | writable | signer | description                                               |
    /// |-------|----------|--------|-----------------------------------------------------------|
    /// | 0     | ✅       | ❌     | authorized_buffer: Destination account of the data        |
    /// | 1     | ❌       | ✅     | fee_payer: Destination account of the data                |
    Debug { 
        buffer_seed: u64,
    },
}
