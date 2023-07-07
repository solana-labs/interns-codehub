use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug, PartialEq)]
pub struct Custody {
	// static parameters
    pub pool: Pubkey, // global pool associated with this custody
    pub mint: Pubkey, // mint token associated with this custody
    pub token_account: Pubkey, // ATA of `mint` for this custody
    pub decimals: u8,

    // bumps for address validation
    pub bump: u8,
    pub token_account_bump: u8,
}

impl Custody {
    pub const LEN: usize = 8 + std::mem::size_of::<Custody>();
}