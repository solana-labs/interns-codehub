use {
    super::{Globalpool, Tick},
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[account]
#[derive(Default)]
pub struct TradePosition {
    pub globalpool: Pubkey,    // Pool where the liquidity was borrowed
    pub position_mint: Pubkey, // Mint of this 1/1 Position account (NFT)

    pub tick_lower_index: i32, // The lower tick index of the loan
    pub tick_upper_index: i32, // The upper tick index of the loan
    pub tick_open_index: i32,  // The current tick index of the pool at the time of loan opening

    pub liquidity_borrowed: u128, // Liquidity borrowed (for opening position) for this loan position. (liquidity amount)

    pub loan_token_available: u64, // Token available (borrowed from globalpool) for this loan position. (the actual amount scaled to decimal exponent, not notional liquidity amount)
    pub loan_token_swapped: u64, // Liquidity swapped (for opening position) for this loan position. (the actual amount scaled to decimal exponent, not notional liquidity amount)
    pub trade_token_amount: u64, // Amount of token received from swapping `loan_token` to the position's long/short token (the actual amount scaled to decimal exponent, not notional liquidity amount)

    pub collateral_amount: u64, // Amount of collateral locked (not sqrt_price or liquidity, the actual amount scaled to decimal exponent)

    pub token_mint_loan: Pubkey, // Mint of the loaned token (can borrow only one token of a CL position)
    pub token_mint_collateral: Pubkey, // Mint of the collateral token (can put only one token as collateral)

    pub open_slot: u64,     // Slot at which the loan was opened
    pub duration: u64,      // The duration of the loan, in slots
    pub interest_rate: u32, // Interest rate paid upfront, for accounting purposes
}

#[derive(Default, Debug, PartialEq)]
pub struct TradePositionUpdate {
    pub loan_token_available: u64,
    pub loan_token_swapped: u64,
    pub trade_token_amount: u64,
    // pub ticks: Vec<TickLoan>,
}

impl TradePosition {
    pub const LEN: usize = 8 + std::mem::size_of::<TradePosition>();

    pub fn is_position_empty(position: &TradePosition) -> bool {
        position.loan_token_swapped == 0
    }

    /// Collateral in Token A implies loan in Token B, and vice versa.
    pub fn is_borrow_a(&self, globalpool: &Account<Globalpool>) -> bool {
        self.token_mint_collateral.eq(&globalpool.token_mint_b)
    }

    pub fn has_matured(&self) -> Result<bool> {
        Ok(Clock::get()?.slot > self.open_slot + self.duration)
    }

    // Long:  borrowing Token B (quote) & swapping to Token A (base)
    // Short: borrowing Token A (base)  & swapping to Token B (quote)
    // Long  => collateral: Token A
    // Short => collateral: Token B
    // pub fn is_long(&self, globalpool: &Account<Globalpool>) -> bool {
    //     !self.is_borrow_a(globalpool)
    // }

    pub fn update(&mut self, update: &TradePositionUpdate) {
        self.loan_token_available = update.loan_token_available;
        self.loan_token_swapped = update.loan_token_swapped;
        self.trade_token_amount = update.trade_token_amount;
    }

    pub fn init_position(
        &mut self,
        globalpool: &Account<Globalpool>,
        position_mint: Pubkey,
        liquidity_borrowed: u128,
        tick_lower_index: i32,
        tick_upper_index: i32,
        loan_duration_slots: u64,
        interest_rate: u32,
    ) -> Result<()> {
        if !Tick::check_is_usable_tick(tick_lower_index, globalpool.tick_spacing)
            || !Tick::check_is_usable_tick(tick_upper_index, globalpool.tick_spacing)
            || tick_lower_index >= tick_upper_index
        {
            return Err(ErrorCode::InvalidTickIndex.into());
        }

        self.globalpool = globalpool.key();
        self.position_mint = position_mint;

        self.tick_lower_index = tick_lower_index;
        self.tick_upper_index = tick_upper_index;
        self.tick_open_index = globalpool.tick_current_index;

        self.open_slot = Clock::get()?.slot;
        self.duration = loan_duration_slots;
        self.interest_rate = interest_rate;

        self.liquidity_borrowed = liquidity_borrowed;

        Ok(())
    }

    pub fn update_position_mints(
        &mut self,
        token_mint_loan: Pubkey,
        token_mint_collateral: Pubkey,
    ) -> Result<()> {
        if self.token_mint_loan == Pubkey::default() {
            self.token_mint_loan = token_mint_loan;
        }
        if self.token_mint_collateral == Pubkey::default() {
            self.token_mint_collateral = token_mint_collateral;
        }
        Ok(())
    }

    pub fn update_collateral_amount(&mut self, collateral_amount: u64) -> Result<()> {
        self.collateral_amount = collateral_amount;
        Ok(())
    }

    pub fn update_liquidity_swapped(
        &mut self,
        loan_token_swapped: i64,
        trade_token_received: i64,
    ) -> Result<()> {
        if loan_token_swapped > 0 {
            self.loan_token_available = self
                .loan_token_available
                .checked_sub(loan_token_swapped as u64)
                .unwrap();
            self.loan_token_swapped = self
                .loan_token_swapped
                .checked_add(loan_token_swapped as u64)
                .unwrap();
        } else {
            self.loan_token_available = self
                .loan_token_available
                .checked_add(loan_token_swapped.abs() as u64)
                .unwrap();
            self.loan_token_swapped = self
                .loan_token_swapped
                .checked_sub(loan_token_swapped.abs() as u64)
                .unwrap();
        }

        if trade_token_received > 0 {
            self.trade_token_amount = self
                .trade_token_amount
                .checked_add(trade_token_received as u64)
                .unwrap();
        } else {
            self.trade_token_amount = self
                .trade_token_amount
                .checked_sub(trade_token_received.abs() as u64)
                .unwrap();
        }

        Ok(())
    }

    // Total borrowed amount denominated as Token Borrowed (actual amount of token, not liquidity representation)
    pub fn total_borrowed_amount(&self) -> u64 {
        self.loan_token_available + self.loan_token_swapped
    }

    //
    // Calculate liquidity borrowed using Uniswap v3 math
    // ie. given borrowed amount of X xor Y, calculate liquidity.
    //
    pub fn calculate_original_borrowed_liquidity(
        &self,
        // globalpool: &Account<Globalpool>,
    ) -> Result<u128> {
        Ok(self.liquidity_borrowed)
        // let is_borrow_a = self.is_borrow_a(globalpool);
        // let borrowed_amount = self.total_borrowed_amount();

        // let sqrt_lower_price = sqrt_price_from_tick_index(self.tick_lower_index); // sqrt(p_a)
        // let sqrt_upper_price = sqrt_price_from_tick_index(self.tick_upper_index); // sqrt(p_b)

        // let round_up = false;

        // let borrowed_liquidity = if self.tick_open_index < self.tick_lower_index {
        //     // original current tick was BELOW position lower tick (borrowed A)
        //     get_liquidity_delta_a(
        //         sqrt_lower_price,
        //         sqrt_upper_price,
        //         borrowed_amount,
        //         round_up,
        //     )
        // } else {
        //     // original current tick was ABOVE position upper tick (borrowed B)
        //     get_liquidity_delta_b(
        //         sqrt_lower_price,
        //         sqrt_upper_price,
        //         borrowed_amount,
        //         round_up,
        //     )
        // }?;

        // Ok(borrowed_liquidity)
    }

    // pub fn calculate_borrowed_liquidity_in_current_terms(
    //     &self,
    //     globalpool: &Account<Globalpool>,
    // ) -> Result<u128> {
    //     let is_borrow_a = self.is_borrow_a(globalpool);
    //     let borrowed_amount = self.total_borrowed_amount();

    //     let sqrt_lower_price = sqrt_price_from_tick_index(self.tick_lower_index); // sqrt(p_a)
    //     let sqrt_upper_price = sqrt_price_from_tick_index(self.tick_upper_index); // sqrt(p_b)

    //     let tick_current_index = globalpool.tick_current_index;
    //     let sqrt_current_price = globalpool.sqrt_price;
    //     let round_up = false;

    //     let mut liquidity: u128 = 0;

    //     if tick_current_index < self.tick_lower_index {
    //         // current tick below position
    //         liquidity = get_liquidity_delta_a(
    //             sqrt_lower_price,
    //             sqrt_upper_price,
    //             borrowed_amount,
    //             round_up,
    //         )?;
    //     } else if tick_current_index < self.tick_upper_index {
    //         // current tick inside position
    //         let liquidity_a = get_liquidity_delta_a(
    //             sqrt_current_price,
    //             sqrt_upper_price,
    //             borrowed_amount,
    //             round_up,
    //         )?;
    //         let liquidity_b = get_liquidity_delta_b(
    //             sqrt_lower_price,
    //             sqrt_current_price,
    //             borrowed_amount,
    //             round_up,
    //         )?;
    //         liquidity = liquidity_a.checked_add(liquidity_b).unwrap();
    //     } else {
    //         // current tick above position
    //         liquidity = get_liquidity_delta_b(
    //             sqrt_lower_price,
    //             sqrt_upper_price,
    //             borrowed_amount,
    //             round_up,
    //         )?;
    //     }

    //     Ok(liquidity)
    // }
}
