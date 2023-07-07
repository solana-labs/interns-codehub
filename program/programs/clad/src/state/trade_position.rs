use {
    super::{Globalpool, TickLoan},
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[account]
#[derive(Default)]
pub struct TradePosition {
    pub globalpool: Pubkey,    // Pool where the liquidity was borrowed
    pub position_mint: Pubkey, // Mint of this 1/1 Position account (NFT)

    pub tick_lower_index: i32, // The (min) lower tick index of the loan
    pub tick_upper_index: i32, // The (max) upper tick index of the loan

    pub liquidity_borrowed: u128, // Liquidity borrowed for this loan position
    pub liquidity_available: u128, // Liquidity available for this loan position
    pub liquidity_mint: Pubkey, // Mint of the liquidity token (can borrow only one token of a CL position)

    pub collateral_amount: u128, //
    pub collateral_mint: Pubkey, // Mint of the collateral token (can put only one token as collateral)

    pub is_trade_open: bool, // Check whether a trade is open on the loan. Only one trade per loan supported for now.

    pub open_slot: u128,    // Slot at which the loan was opened
    pub duration: u64,      // The duration of the loan, in slots
    pub interest_rate: u16, // Interest rate paid upfront, for accounting purposes

    pub ticks: Vec<TickLoan>, // stores all Ticks that this trade position borrows from
}

#[derive(Default, Debug, PartialEq)]
pub struct TradePositionUpdate {
    pub liquidity_available: u128,
    pub liquidity_borrowed: u128,
    pub ticks: Vec<TickLoan>,
}

impl TradePosition {
    pub const LEN: usize = 8 + std::mem::size_of::<TradePosition>();

    pub fn is_position_empty<'info>(position: &TradePosition) -> bool {
        !position.is_trade_open
    }

    pub fn update(&mut self, update: &TradePositionUpdate) {
        self.liquidity_available = update.liquidity_available;
        self.liquidity_borrowed = update.liquidity_borrowed;

        if self.liquidity_available == self.liquidity_borrowed {
            self.is_trade_open = false;
        } else if (self.liquidity_available != self.liquidity_borrowed && !self.is_trade_open) {
            self.is_trade_open = true;
        }
    }

    pub fn open_position(
        &mut self,
        globalpool: &Account<Globalpool>,
        ticks: &Vec<TickLoan>,
        a_not_b: bool,
    ) -> Result<()> {
        for tick in ticks {}

        todo!()
    }
}
