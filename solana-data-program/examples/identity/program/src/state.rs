use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

// pub const COLORS: &[u8] = b"{\"10\":{\"A\":{\"env\":[\"#104c8c\"],\"clo\":[\"#354B65\",\"#3D8EBB\",\"#89D0DA\",\"#00FFFD\"],\"head\":[\"#cc9a5c\"],\"mouth\":[\"#222\",\"#fff\"],\"eyes\":[\"#000\",\"#000\"],\"top\":[\"#fff\",\"#fff\",\"none\"]},\"B\":{\"env\":[\"#0DC15C\"],\"clo\":[\"#212121\",\"#fff\",\"#212121\",\"#fff\"],\"head\":[\"#dca45f\"],\"mouth\":[\"#111\",\"#633b1d\"],\"eyes\":[\"#000\",\"#000\"],\"top\":[\"none\",\"#792B74\",\"#792B74\"]},\"C\":{\"env\":[\"#ffe500\"],\"clo\":[\"#1e5e80\",\"#fff\",\"#1e5e80\",\"#fff\"],\"head\":[\"#e8bc86\"],\"mouth\":[\"#111\",\"none\"],\"eyes\":[\"#000\",\"#000\"],\"top\":[\"none\",\"none\",\"#633b1d\"]}},\"11\":{\"A\":{\"env\":[\"#4a3f73\"],\"clo\":[\"#e6e9ee\",\"#f1543f\",\"#ff7058\",\"#fff\",\"#fff\"],\"head\":[\"#b27e5b\"],\"mouth\":[\"#191919\",\"#191919\"],\"eyes\":[\"#000\",\"#000\",\"#57FFFD\"],\"top\":[\"#ffc\",\"#ffc\",\"#ffc\"]},\"B\":{\"env\":[\"#00a08d\"],\"clo\":[\"#FFBA32\",\"#484848\",\"#4e4e4e\",\"#fff\",\"#fff\"],\"head\":[\"#ab5f2c\"],\"mouth\":[\"#191919\",\"#191919\"],\"eyes\":[\"#000\",\"#ff23fa;opacity:0.39\",\"#000\"],\"top\":[\"#ff90f4\",\"#ff90f4\",\"#ff90f4\"]},\"C\":{\"env\":[\"#22535d\"],\"clo\":[\"#000\",\"#ff2500\",\"#ff2500\",\"#fff\",\"#fff\"],\"head\":[\"#a76c44\"],\"mouth\":[\"#191919\",\"#191919\"],\"eyes\":[\"#000\",\"none\",\"#000\"],\"top\":[\"none\",\"#00efff\",\"none\"]}},\"12\":{\"A\":{\"env\":[\"#2668DC\"],\"clo\":[\"#2385c6\",\"#b8d0e0\",\"#b8d0e0\"],\"head\":[\"#ad8a60\"],\"mouth\":[\"#000\",\"#4d4d4d\"],\"eyes\":[\"#7fb5a2\",\"#d1eddf\",\"#301e19\"],\"top\":[\"#fff510\",\"#fff510\"]},\"B\":{\"env\":[\"#643869\"],\"clo\":[\"#D67D1B\",\"#b8d0e0\",\"#b8d0e0\"],\"head\":[\"#CC985A\",\"none0000\"],\"mouth\":[\"#000\",\"#ececec\"],\"eyes\":[\"#1f2644\",\"#9b97ce\",\"#301e19\"],\"top\":[\"#00eaff\",\"none\"]},\"C\":{\"env\":[\"#F599FF\"],\"clo\":[\"#2823C6\",\"#b8d0e0\",\"#b8d0e0\"],\"head\":[\"#C7873A\"],\"mouth\":[\"#000\",\"#4d4d4d\"],\"eyes\":[\"#581b1b\",\"#FF8B8B\",\"#000\"],\"top\":[\"none\",\"#9c0092\"]}},\"13\":{\"A\":{\"env\":[\"#d10084\"],\"clo\":[\"#efedee\",\"#00a1e0\",\"#00a1e0\",\"#efedee\",\"#ffce1c\"],\"head\":[\"#b35f49\"],\"mouth\":[\"#3a484a\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#000\",\"none\",\"#000\",\"none\"]},\"B\":{\"env\":[\"#E6C117\"],\"clo\":[\"#efedee\",\"#ec0033\",\"#ec0033\",\"#efedee\",\"#f2ff05\"],\"head\":[\"#ffc016\"],\"mouth\":[\"#4a3737\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#ffe900\",\"#ffe900\",\"none\",\"#ffe900\"]},\"C\":{\"env\":[\"#1d8c00\"],\"clo\":[\"#e000cb\",\"#fff\",\"#fff\",\"#e000cb\",\"#ffce1c\"],\"head\":[\"#b96438\"],\"mouth\":[\"#000\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#53ffff\",\"#53ffff\",\"none\",\"none\"]}},\"14\":{\"A\":{\"env\":[\"#fc0065\"],\"clo\":[\"#708913\",\"#fdea14\",\"#708913\",\"#fdea14\",\"#708913\"],\"head\":[\"#DEA561\"],\"mouth\":[\"#444\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\",\"#32393f\"]},\"B\":{\"env\":[\"#81f72e\"],\"clo\":[\"#ff0000\",\"#ffc107\",\"#ff0000\",\"#ffc107\",\"#ff0000\"],\"head\":[\"#ef9831\"],\"mouth\":[\"#6b0000\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"#FFFAAD\",\"none\",\"none\",\"none\",\"none\"]},\"C\":{\"env\":[\"#00D872\"],\"clo\":[\"#590D00\",\"#FD1336\",\"#590D00\",\"#FD1336\",\"#590D00\"],\"head\":[\"#c36c00\"],\"mouth\":[\"#56442b\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#004E4C\",\"#004E4C\",\"#004E4C\",\"#004E4C\",\"#004E4C\",\"#004E4C\",\"#004E4C\",\"#004E4C\",\"#004E4C\",\"none\",\"none\",\"none\",\"none\",\"none\",\"none\",\"none\",\"none\"]}},\"15\":{\"A\":{\"env\":[\"#111\"],\"clo\":[\"#000\",\"#00FFFF\"],\"head\":[\"#755227\"],\"mouth\":[\"#fff\",\"#000\"],\"eyes\":[\"black\",\"#008;opacity:0.67\",\"aqua\"],\"top\":[\"#fff\",\"#fff\",\"#fff\",\"#fff\",\"#fff\"]},\"B\":{\"env\":[\"#00D0D4\"],\"clo\":[\"#000\",\"#fff\"],\"head\":[\"#755227\"],\"mouth\":[\"#fff\",\"#000\"],\"eyes\":[\"black\",\"#1df7ff;opacity:0.64\",\"#fcff2c\"],\"top\":[\"#fff539\",\"none\",\"#fff539\",\"none\",\"#fff539\"]},\"C\":{\"env\":[\"#DC75FF\"],\"clo\":[\"#000\",\"#FFBDEC\"],\"head\":[\"#997549\"],\"mouth\":[\"#fff\",\"#000\"],\"eyes\":[\"black\",\"black\",\"aqua\"],\"top\":[\"#00fffd\",\"none\",\"none\",\"none\",\"none\"]}},\"00\":{\"A\":{\"env\":[\"#ff2f2b\"],\"clo\":[\"#fff\",\"#000\"],\"head\":[\"#fff\"],\"mouth\":[\"#fff\",\"#000\",\"#000\"],\"eyes\":[\"#000\",\"none\",\"#00FFFF\"],\"top\":[\"#fff\",\"#fff\"]},\"B\":{\"env\":[\"#ff1ec1\"],\"clo\":[\"#000\",\"#fff\"],\"head\":[\"#ffc1c1\"],\"mouth\":[\"#fff\",\"#000\",\"#000\"],\"eyes\":[\"#FF2D00\",\"#fff\",\"none\"],\"top\":[\"#a21d00\",\"#fff\"]},\"C\":{\"env\":[\"#0079b1\"],\"clo\":[\"#0e00b1\",\"#d1fffe\"],\"head\":[\"#f5aa77\"],\"mouth\":[\"#fff\",\"#000\",\"#000\"],\"eyes\":[\"#0c00de\",\"#fff\",\"none\"],\"top\":[\"#acfffd\",\"#acfffd\"]}},\"01\":{\"A\":{\"env\":[\"#a50000\"],\"clo\":[\"#f06\",\"#8e0039\"],\"head\":[\"#85492C\"],\"mouth\":[\"#000\"],\"eyes\":[\"#000\",\"#ff9809\"],\"top\":[\"#ff9809\",\"#ff9809\",\"none\",\"none\"]},\"B\":{\"env\":[\"#40E83B\"],\"clo\":[\"#00650b\",\"#62ce5a\"],\"head\":[\"#f7c1a6\"],\"mouth\":[\"#6e1c1c\"],\"eyes\":[\"#000\",\"#ff833b\"],\"top\":[\"#67FFCC\",\"none\",\"none\",\"#ecff3b\"]},\"C\":{\"env\":[\"#ff2c2c\"],\"clo\":[\"#fff\",\"#000\"],\"head\":[\"#ffce8b\"],\"mouth\":[\"#000\"],\"eyes\":[\"#000\",\"#0072ff\"],\"top\":[\"#ff9809\",\"none\",\"#ffc809\",\"none\"]}},\"02\":{\"A\":{\"env\":[\"#ff7520\"],\"clo\":[\"#d12823\"],\"head\":[\"#fee3c5\"],\"mouth\":[\"#d12823\"],\"eyes\":[\"#000\",\"none\"],\"top\":[\"#000\",\"none\",\"none\",\"#FFCC00\",\"red\"]},\"B\":{\"env\":[\"#ff9700\"],\"clo\":[\"#000\"],\"head\":[\"#d2ad6d\"],\"mouth\":[\"#000\"],\"eyes\":[\"#000\",\"#00ffdc\"],\"top\":[\"#fdff00\",\"#fdff00\",\"none\",\"none\",\"none\"]},\"C\":{\"env\":[\"#26a7ff\"],\"clo\":[\"#d85cd7\"],\"head\":[\"#542e02\"],\"mouth\":[\"#f70014\"],\"eyes\":[\"#000\",\"magenta\"],\"top\":[\"#FFCC00\",\"#FFCC00\",\"#FFCC00\",\"#ff0000\",\"yellow\"]}},\"03\":{\"A\":{\"env\":[\"#6FC30E\"],\"clo\":[\"#b4e1fa\",\"#5b5d6e\",\"#515262\",\"#a0d2f0\",\"#a0d2f0\"],\"head\":[\"#fae3b9\"],\"mouth\":[\"#fff\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#8eff45\",\"#8eff45\",\"none\",\"none\"]},\"B\":{\"env\":[\"#00a58c\"],\"clo\":[\"#000\",\"none\",\"none\",\"none\",\"none\"],\"head\":[\"#FAD2B9\"],\"mouth\":[\"#fff\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#FFC600\",\"none\",\"#FFC600\",\"none\"]},\"C\":{\"env\":[\"#ff501f\"],\"clo\":[\"#000\",\"#ff0000\",\"#ff0000\",\"#7d7d7d\",\"#7d7d7d\"],\"head\":[\"#fff3dc\"],\"mouth\":[\"#d2001b\",\"none\"],\"eyes\":[\"#000\"],\"top\":[\"#D2001B\",\"none\",\"none\",\"#D2001B\"]}},\"04\":{\"A\":{\"env\":[\"#fc0\"],\"clo\":[\"#901e0e\",\"#ffbe1e\",\"#ffbe1e\",\"#c55f54\"],\"head\":[\"#f8d9ad\"],\"mouth\":[\"#000\",\"none\",\"#000\",\"none\"],\"eyes\":[\"#000\"],\"top\":[\"#583D00\",\"#AF892E\",\"#462D00\",\"#a0a0a0\"]},\"B\":{\"env\":[\"#386465\"],\"clo\":[\"#fff\",\"#333\",\"#333\",\"#333\"],\"head\":[\"#FFD79D\"],\"mouth\":[\"#000\",\"#000\",\"#000\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#27363C\",\"#5DCAD4\",\"#314652\",\"#333\"]},\"C\":{\"env\":[\"#DFFF00\"],\"clo\":[\"#304267\",\"#aab0b1\",\"#aab0b1\",\"#aab0b1\"],\"head\":[\"#e6b876\"],\"mouth\":[\"#50230a\",\"#50230a\",\"#50230a\",\"#50230a\"],\"eyes\":[\"#000\"],\"top\":[\"#333\",\"#afafaf\",\"#222\",\"#6d3a1d\"]}},\"05\":{\"A\":{\"env\":[\"#a09300\"],\"clo\":[\"#c7d4e2\",\"#435363\",\"#435363\",\"#141720\",\"#141720\",\"#e7ecf2\",\"#e7ecf2\"],\"head\":[\"#f5d4a6\"],\"mouth\":[\"#000\",\"#cf9f76\"],\"eyes\":[\"#000\",\"#000\",\"#000\",\"#000\",\"#000\",\"#000\",\"#fff\",\"#fff\",\"#fff\",\"#fff\",\"#000\",\"#000\"],\"top\":[\"none\",\"#fdff00\"]},\"B\":{\"env\":[\"#b3003e\"],\"clo\":[\"#000\",\"#435363\",\"#435363\",\"#000\",\"none\",\"#e7ecf2\",\"#e7ecf2\"],\"head\":[\"#f5d4a6\"],\"mouth\":[\"#000\",\"#af9f94\"],\"eyes\":[\"#9ff3ff;opacity:0.96\",\"#000\",\"#9ff3ff;opacity:0.96\",\"#000\",\"#2f508a\",\"#000\",\"#000\",\"#000\",\"none\",\"none\",\"none\",\"none\"],\"top\":[\"#ff9a00\",\"#ff9a00\"]},\"C\":{\"env\":[\"#884f00\"],\"clo\":[\"#ff0000\",\"#fff\",\"#fff\",\"#141720\",\"#141720\",\"#e7ecf2\",\"#e7ecf2\"],\"head\":[\"#c57b14\"],\"mouth\":[\"#000\",\"#cf9f76\"],\"eyes\":[\"none\",\"#000\",\"none\",\"#000\",\"#5a0000\",\"#000\",\"#000\",\"#000\",\"none\",\"none\",\"none\",\"none\"],\"top\":[\"#efefef\",\"none\"]}},\"06\":{\"A\":{\"env\":[\"#8acf00\"],\"clo\":[\"#ee2829\",\"#ff0\"],\"head\":[\"#ffce73\"],\"mouth\":[\"#fff\",\"#000\"],\"eyes\":[\"#000\"],\"top\":[\"#000\",\"#000\",\"none\",\"#000\",\"#ff4e4e\",\"#000\"]},\"B\":{\"env\":[\"#00d2a3\"],\"clo\":[\"#0D0046\",\"#ffce73\"],\"head\":[\"#ffce73\"],\"mouth\":[\"#000\",\"none\"],\"eyes\":[\"#000\"],\"top\":[\"#000\",\"#000\",\"#000\",\"none\",\"#ffb358\",\"#000\",\"none\",\"none\"]},\"C\":{\"env\":[\"#ff184e\"],\"clo\":[\"#000\",\"none\"],\"head\":[\"#ffce73\"],\"mouth\":[\"#ff0000\",\"none\"],\"eyes\":[\"#000\"],\"top\":[\"none\",\"none\",\"none\",\"none\",\"none\",\"#ffc107\",\"none\",\"none\"]}},\"07\":{\"A\":{\"env\":[\"#00deae\"],\"clo\":[\"#ff0000\"],\"head\":[\"#ffce94\"],\"mouth\":[\"#f73b6c\",\"#000\"],\"eyes\":[\"#e91e63\",\"#000\",\"#e91e63\",\"#000\",\"#000\",\"#000\"],\"top\":[\"#dd104f\",\"#dd104f\",\"#f73b6c\",\"#dd104f\"]},\"B\":{\"env\":[\"#181284\"],\"clo\":[\"#491f49\",\"#ff9809\",\"#491f49\"],\"head\":[\"#f6ba97\"],\"mouth\":[\"#ff9809\",\"#000\"],\"eyes\":[\"#c4ffe4\",\"#000\",\"#c4ffe4\",\"#000\",\"#000\",\"#000\"],\"top\":[\"none\",\"none\",\"#d6f740\",\"#516303\"]},\"C\":{\"env\":[\"#bcf700\"],\"clo\":[\"#ff14e4\",\"#000\",\"#14fffd\"],\"head\":[\"#7b401e\"],\"mouth\":[\"#666\",\"#000\"],\"eyes\":[\"#00b5b4\",\"#000\",\"#00b5b4\",\"#000\",\"#000\",\"#000\"],\"top\":[\"#14fffd\",\"#14fffd\",\"#14fffd\",\"#0d3a62\"]}},\"08\":{\"A\":{\"env\":[\"#0df\"],\"clo\":[\"#571e57\",\"#ff0\"],\"head\":[\"#f2c280\"],\"eyes\":[\"#795548\",\"#000\"],\"mouth\":[\"#ff0000\"],\"top\":[\"#de3b00\",\"none\"]},\"B\":{\"env\":[\"#B400C2\"],\"clo\":[\"#0D204A\",\"#00ffdf\"],\"head\":[\"#ca8628\"],\"eyes\":[\"#cbbdaf\",\"#000\"],\"mouth\":[\"#1a1a1a\"],\"top\":[\"#000\",\"#000\"]},\"C\":{\"env\":[\"#ffe926\"],\"clo\":[\"#00d6af\",\"#000\"],\"head\":[\"#8c5100\"],\"eyes\":[\"none\",\"#000\"],\"mouth\":[\"#7d0000\"],\"top\":[\"#f7f7f7\",\"none\"]}},\"09\":{\"A\":{\"env\":[\"#4aff0c\"],\"clo\":[\"#101010\",\"#fff\",\"#fff\"],\"head\":[\"#dbbc7f\"],\"mouth\":[\"#000\"],\"eyes\":[\"#000\",\"none\",\"none\"],\"top\":[\"#531148\",\"#531148\",\"#531148\",\"none\"]},\"B\":{\"env\":[\"#FFC107\"],\"clo\":[\"#033c58\",\"#fff\",\"#fff\"],\"head\":[\"#dbc97f\"],\"mouth\":[\"#000\"],\"eyes\":[\"none\",\"#fff\",\"#000\"],\"top\":[\"#FFEB3B\",\"#FFEB3B\",\"none\",\"#FFEB3B\"]},\"C\":{\"env\":[\"#FF9800\"],\"clo\":[\"#b40000\",\"#fff\",\"#fff\"],\"head\":[\"#E2AF6B\"],\"mouth\":[\"#000\"],\"eyes\":[\"none\",\"#fff\",\"#000\"],\"top\":[\"#ec0000\",\"#ec0000\",\"none\",\"none\"]}}}";

pub const SVGSTART: &[u8] = b"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 231 231\">";
pub const SVGEND: &[u8] = b"</svg>";

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct InitializeIdentityArgs {
    pub identity: Pubkey,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct AppendIdentityCloArgs {
    pub identity: Pubkey,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct AppendIdentityTopArgs {
    pub identity: Pubkey,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct AppendIdentityEyesArgs {
    pub identity: Pubkey,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct AppendIdentityMouthArgs {
    pub identity: Pubkey,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct CompleteIdentityArgs {}

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
