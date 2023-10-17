use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const COLORS: &'static [&'static str] = &[
    "FEF479", "FFF578", "FFF475", "FFF574", "FFF56F", "FEF471", "FFF46C", "FFF56B", "FEF468",
    "FFF464", "FFF466", "FFF462", "FEF35B", "FEF35F", "FFF45E", "FFF459", "FFF451", "FFF455",
    "FEF356", "FEF352", "FEF34E", "FFF34C", "FFF348", "FEF349", "FEF241", "FEF245", "FFF343",
    "FFF33B", "FEF23C", "FFF33F", "FFF232", "FEF233", "FEF238", "FFF336", "FEF12A", "FFF229",
    "FFF22D", "FEF22F", "FEF11D", "FEF122", "FEF126", "FFF21C", "FFF220", "FFF225", "FEF007",
    "FEF00C", "FEF010", "FFD11A", "FFE60A", "FEE608", "FEE708", "FFD616", "FED614", "FFD815",
    "FED813", "FFF10A", "FFF113", "FEF119", "FFD417", "FED416", "FEEB05", "FEEB04", "FFDB12",
    "FEDC10", "FEF10F", "FEF115", "FEF117", "FEE807", "FFE907", "FEEA05", "FFED04", "FFD913",
    "FEDA12", "FEED03", "FFE20C", "FFDF0F", "FEE30B", "FEDF0E", "FFDD10", "FEDD0F", "FEEF03",
    "FEEF01", "FEF002", "FEF003", "FEF006", "FFE40B", "FEE409", "FFE00E", "FEE10C", "FED119",
    "FFD218", "FFD700", "FECB1D", "FFCA20", "FFCB1E", "FFC622", "FFC621", "FEC81F", "FECF1A",
    "FFCF1B", "FFC126", "FFC125", "FFC325", "FFC324", "FFB533", "FFC821", "FECA1E", "FFAB3F",
    "FFCD1D", "FECD1B", "FFC423", "FEC422", "FFBD2A", "FFBD28", "FFB038", "FFB92F", "FFB92D",
    "FFB138", "FFB136", "FFBF28", "FFBF26", "FFA841", "FFA941", "FFB335", "FFB334", "FFBB2C",
    "FFBB2B", "FFB531", "FFAC3D", "FFAD3C", "FFAD3A", "FFAF3A", "FFB731", "FFB72F", "FF9F4C",
    "FFA04A", "FFA14A", "FF9953", "FF9A51", "FF9B51", "FFA93F", "FFA545", "FFA543", "FFA743",
    "FF9C4F", "FF9D4E", "FF9D4C", "FFA348", "FFA446", "FF925A", "FFA148", "FF9557", "FF9458",
    "FF945A", "FF9655", "FF9855", "FF9853", "FF905E", "FF915C", "FF905C", "FF8C63", "FF8E5F",
    "FF8D60", "FF8C61", "FF8866", "FF8865", "FE8663", "FF8A63", "FF8965", "FF8662", "FE8461",
    "FE8460", "FD825E", "FE825D", "FC7E58", "FD805B", "FD7E58", "FC7D56", "FC7C55", "FB7B53",
    "FB7950", "FC7950", "FC7A52", "FA774D", "FA754B", "FB754A", "FB774D", "F97348", "FA7145",
    "FA7347", "F86F43", "F97146", "F86E40", "F96D40", "F96F42", "F86C3D", "F86B3D", "F86A3A",
    "F76A3B", "F76838", "F76837", "F76635", "F66635", "F66432", "F6622F", "F5602D", "F5602C",
    "F56230", "F45F2B", "F55E2A", "F45B25", "F45D28", "F45C27", "F35922", "F35720", "F3571F",
    "F0511F", "F2551D", "F2551C", "F2531B", "F2531D", "F0511D", "EF4F1F", "EF4F21", "EC4B23",
    "EC4A25", "ED4D21", "ED4C23", "E94627", "E94629", "EA4825", "EA4827", "E7442B", "E6422D",
    "E74429", "E6422B", "E4402D", "E43F2F", "E33E2F", "E33D31", "DE3735", "DE3737", "E13B31",
    "E13B33", "E03A33", "E03935", "DB3339", "DB333B", "DD3539", "DD3537", "D72C41", "D82E3D",
    "D82E3F", "D72D3F", "DA313B", "DA313D", "D22645", "D22647", "D52A41", "D52A43", "D42843",
    "D42845", "CE204B", "CE1F4D", "D12449", "CF2249", "CF214B", "D12447", "C81854", "CB1B4F",
    "C91951", "CA1953", "C81853", "CC1D4F", "CB1B51", "CC1D4D", "C21859", "C11859", "C1185A",
    "C0185A", "C0185B", "BF185C", "C21858", "C71854", "C61855", "C61856", "C51856", "C51857",
    "C41857", "C41858", "C71855", "B81862", "B9185F", "B91861", "B81861", "BD185E", "BB185E",
    "BB185F", "BA185F", "BA1860", "BD185C", "BC185D", "BE185D", "BF185B", "AF1867", "AE1868",
    "AD1869", "AE186A", "AD186A", "AC186C", "B41863", "B41865", "B31865", "B21865", "B31866",
    "B21867", "B11867", "B11868", "AF1869", "B61861", "B61863", "B51863", "B51864", "A4166F",
    "A9186C", "A8186D", "A8186E", "A6176E", "A6186F", "A41770", "AC186A", "AA186B", "AB186C",
    "AA186E", "9E1472", "9D1573", "9B1373", "9B1474", "991375", "A21670", "A21671", "A01571",
    "9F1572", "921176", "921177", "901077", "901078", "971274", "961276", "951275", "941277",
    "991374", "850C7C", "840D7D", "830C7D", "820C7E", "8C0F79", "8B0F7A", "890E7A", "890E7B",
    "870D7B", "870E7C", "8E0F78", "8D1079", "750782", "7E0A7E", "7C097F", "7B0A80", "7A0980",
    "790981", "770881", "770882", "750883", "800B7D", "800B7F", "7E0B80", "6A0486", "6A0587",
    "680486", "680687", "660586", "650686", "640686", "640786", "730783", "730784", "710684",
    "710685", "6E0585", "6E0586", "6C0586", "6C0587", "4F0F82", "4D1082", "4C1182", "4A1282",
    "510E82", "590B84", "590C84", "570C84", "570D84", "550C83", "550E84", "530D83", "530F83",
    "510F83", "4F1083", "5D0984", "5B0A84", "620785", "610886", "600885", "5F0986", "5D0A85",
    "5B0B85", "2C1A75", "2E1B79", "2E1C78", "2D1B77", "301D7C", "2F1C7B", "321C7D", "311D7E",
    "301D7D", "40157F", "3E167F", "3C177F", "3C187F", "3A187E", "3A197F", "38197E", "381A7F",
    "361A7E", "361B7E", "341B7D", "331C7E", "421580", "421680", "401780", "3E1880", "4B1181",
    "491281", "481381", "471381", "461481", "441480", "441581", "221361", "231361", "22125F",
    "22135F", "21125D", "241465", "251565", "241463", "251567", "261667", "27176B", "28176B",
    "261669", "29186F", "28176D", "2B1973", "2B1A73", "2A1871", "2A1971", "160A48", "170B48",
    "190C4E", "190D4E", "180C4C", "190C4C", "170B4A", "1B0D52", "1B0E51", "1A0D50", "1E1058",
    "1E1057", "1D0F56", "1D0F55", "1C0E54", "1C0F54", "20115C", "20125B", "1F1059", "1F1159",
    "000000",
];

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateQuineMetadataArgs {
    pub metadata_update_offset: u64,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct AppendQuineMetadataArgs {
    pub metadata_end_offset: u64,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateQuineColorArgs {
    pub color_update_offset: u64,
}

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
