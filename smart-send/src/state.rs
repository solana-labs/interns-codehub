use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;


#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum State {
    InitializingInputs,
    InitializingOutputs,
    InitializingBoth,
    Refunding,
    AwaitingDeposits,
    Withdrawing,
    Closed

}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SmartSendData {
    
    pub inputs: Vec<Pubkey>, //public keys
    pub input_amounts: Vec<u64>,
    pub input_success: Vec<bool>,
    pub outputs: Vec<Pubkey>, //public keys
    pub output_amounts: Vec<u64>,
    pub output_success: Vec<bool>,
    pub state: State,
    pub payer: Pubkey,
    pub inputs_initialized: usize,
    pub outputs_initialized: usize

}

