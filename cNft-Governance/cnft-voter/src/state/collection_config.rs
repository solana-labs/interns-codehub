use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Copy, Default)]
pub struct CollectionConfig {
    /// collection mint address
    pub collection: Pubkey,

    /// number of nft in this collection
    pub size: u32,

    /// the power weight of each NFT possess
    pub weight: u64,

    /// reserved for future upgrades,
    pub reserved: [u8; 8], // what is this for
}

impl CollectionConfig {
    pub fn get_max_weight(&self) -> u64 {
        let max_weight: u64 = (self.size as u64).checked_mul(self.weight).unwrap();
        max_weight
    }
}
