use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const DATA_END_OFFSET: usize = 14;

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct TestLuckArgs {}

/// Data Program constants and types
pub const DATA_VERSION: u8 = 0;
pub const METADATA_SIZE: usize = 1 + 1 + 32 + 1 + 1 + 1 + 1;
pub const PDA_SEED: &[u8] = b"data_account_metadata";

#[derive(PartialEq, Debug, Clone, BorshDeserialize, BorshSerialize)]
pub enum DataTypeOption {
    CUSTOM = 0,
    JSON = 1,
    IMG = 2,
    HTML = 3,
}

#[derive(PartialEq, Debug, Clone, BorshDeserialize, BorshSerialize)]
pub enum DataStatusOption {
    UNINITIALIZED,
    INITIALIZED,
    FINALIZED,
}

#[derive(PartialEq, Debug, Clone, BorshDeserialize, BorshSerialize)]
pub enum SerializationStatusOption {
    UNVERIFIED,
    VERIFIED,
    FAILED,
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, ShankAccount)]
pub struct DataAccountMetadata {
    data_status: DataStatusOption,
    serialization_status: SerializationStatusOption,
    authority: Pubkey,
    is_dynamic: bool,
    data_version: u8,
    data_type: DataTypeOption,
    bump_seed: u8,
}

impl DataAccountMetadata {
    /// Default constructor
    pub fn new(
        data_status: DataStatusOption,
        serialization_status: SerializationStatusOption,
        authority: Pubkey,
        is_dynamic: bool,
        data_version: u8,
        data_type: DataTypeOption,
        bump_seed: u8,
    ) -> Self {
        DataAccountMetadata {
            data_status,
            serialization_status,
            authority,
            is_dynamic,
            data_version,
            data_type,
            bump_seed,
        }
    }
    /// Get the data_status
    pub fn data_status(&self) -> &DataStatusOption {
        &self.data_status
    }
    /// Set the data_status
    pub fn set_data_status(&mut self, data_status: DataStatusOption) {
        self.data_status = data_status;
    }
    /// Get the serialization_status
    pub fn serialization_status(&self) -> &SerializationStatusOption {
        &self.serialization_status
    }
    /// Set the serialization_status
    pub fn set_serialization_status(&mut self, serialization_status: SerializationStatusOption) {
        self.serialization_status = serialization_status;
    }
    /// Get the authority
    pub fn authority(&self) -> &Pubkey {
        &self.authority
    }
    /// Set the authority
    pub fn set_authority(&mut self, authority: Pubkey) {
        self.authority = authority;
    }
    /// Get the dynamic flag
    pub fn dynamic(&self) -> bool {
        self.is_dynamic
    }
    /// Get the current data version
    pub fn version(&self) -> u8 {
        self.data_version
    }
    /// Get the data_type
    pub fn data_type(&self) -> &DataTypeOption {
        &self.data_type
    }
    /// Set the data_type
    pub fn set_data_type(&mut self, data_type: DataTypeOption) {
        self.data_type = data_type;
    }
    /// Get the bump seed
    pub fn bump_seed(&self) -> u8 {
        self.bump_seed
    }
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateDataAccountArgs {
    pub data_type: DataTypeOption,
    pub data: Vec<u8>,
    pub offset: u64,
    pub realloc_down: bool,
    pub verify_flag: bool,
    pub debug: bool,
}
