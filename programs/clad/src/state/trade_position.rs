use {
    super::{Globalpool, Tick},
    crate::{
        errors::ErrorCode,
        math::{get_liquidity_delta_a, get_liquidity_delta_b, sqrt_price_from_tick_index},
    },
    anchor_lang::prelude::*,
};

#[account]
#[derive(Default)]
pub struct TradePosition {
    pub globalpool: Pubkey,    // Pool where the liquidity was borrowed
    pub position_mint: Pubkey, // Mint of this 1/1 Position account (NFT)

    pub tick_lower_index: i32, // The lower tick index of the loan
    pub tick_upper_index: i32, // The upper tick index of the loan
    pub tick_current_index_original: i32, // The current tick index of the loan, when the loan was opened

    pub liquidity_available: u64, // Liquidity available (borrowed from globalpool) for this loan position. (the actual amount scaled to decimal exponent, not nominal liquidity amount)
    pub liquidity_swapped: u64, // Liquidity swapped (for opening position) for this loan position. (the actual amount scaled to decimal exponent, not nominal liquidity amount)
    pub liquidity_mint: Pubkey, // Mint of the liquidity token (can borrow only one token of a CL position)

    pub collateral_amount: u64, // Amount of collateral locked (not sqrt_price or liquidity, the actual amount scaled to decimal exponent)
    pub collateral_mint: Pubkey, // Mint of the collateral token (can put only one token as collateral)

    pub open_slot: u64,     // Slot at which the loan was opened
    pub duration: u64,      // The duration of the loan, in slots
    pub interest_rate: u32, // Interest rate paid upfront, for accounting purposes
}

#[derive(Default, Debug, PartialEq)]
pub struct TradePositionUpdate {
    pub liquidity_available: u64,
    pub liquidity_swapped: u64,
    // pub ticks: Vec<TickLoan>,
}

impl TradePosition {
    pub const LEN: usize = 8 + std::mem::size_of::<TradePosition>();

    pub fn is_position_empty(position: &TradePosition) -> bool {
        position.liquidity_swapped == 0
    }

    /// Collateral in Token A implies loan in Token B, and vice versa.
    pub fn is_borrow_a(&self, globalpool: &Account<Globalpool>) -> bool {
        self.collateral_mint.eq(&globalpool.token_mint_b)
    }

    // Long:  borrowing Token B (quote) & swapping to Token A (base)
    // Short: borrowing Token A (base)  & swapping to Token B (quote)
    // Long  => collateral: Token A
    // Short => collateral: Token B
    pub fn is_long(&self, globalpool: &Account<Globalpool>) -> bool {
        !self.is_borrow_a(globalpool)
    }

    // See above `is_long`
    pub fn is_long_check_borrow(is_borrow_token_a: bool) -> bool {
        !is_borrow_token_a
    }

    pub fn update(&mut self, update: &TradePositionUpdate) {
        self.liquidity_available = update.liquidity_available;
        self.liquidity_swapped = update.liquidity_swapped;
    }

    pub fn init_position(
        &mut self,
        globalpool: &Account<Globalpool>,
        position_mint: Pubkey,
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
        self.tick_current_index_original = globalpool.tick_current_index;

        self.open_slot = Clock::get()?.slot;
        self.duration = loan_duration_slots;
        self.interest_rate = interest_rate;

        Ok(())
    }

    pub fn update_position_mints(
        &mut self,
        liquidity_mint: Pubkey,
        collateral_mint: Pubkey,
    ) -> Result<()> {
        if self.liquidity_mint == Pubkey::default() {
            self.liquidity_mint = liquidity_mint;
        }
        if self.collateral_mint == Pubkey::default() {
            self.collateral_mint = collateral_mint;
        }
        Ok(())
    }

    pub fn update_collateral_amount(&mut self, collateral_amount: u64) -> Result<()> {
        self.collateral_amount = collateral_amount;
        Ok(())
    }

    pub fn update_liquidity_swapped(&mut self, liquidity_swapped: u64) -> Result<()> {
        self.liquidity_available = self
            .liquidity_available
            .checked_sub(liquidity_swapped)
            .unwrap();
        self.liquidity_swapped = liquidity_swapped;
        Ok(())
    }

    // Total borrowed amount denominated as Token Borrowed (actual amount of token, not liquidity representation)
    pub fn total_borrowed_amount(&self) -> u64 {
        self.liquidity_available + self.liquidity_swapped
    }

    pub fn calculate_original_borrowed_liquidity(
        &self,
        globalpool: &Account<Globalpool>,
    ) -> Result<u128> {
        let is_borrow_a = self.is_borrow_a(globalpool);
        let borrowed_amount = self.total_borrowed_amount();

        let sqrt_lower_price = sqrt_price_from_tick_index(self.tick_lower_index); // sqrt(p_a)
        let sqrt_upper_price = sqrt_price_from_tick_index(self.tick_upper_index); // sqrt(p_b)

        let round_up = false;

        let borrowed_liquidity = if self.tick_current_index_original < self.tick_lower_index {
            // original current tick was BELOW position lower tick (borrowed A)
            get_liquidity_delta_a(
                sqrt_lower_price,
                sqrt_upper_price,
                borrowed_amount,
                round_up,
            )
        } else {
            // original current tick was ABOVE position upper tick (borrowed B)
            get_liquidity_delta_b(
                sqrt_lower_price,
                sqrt_upper_price,
                borrowed_amount,
                round_up,
            )
        }?;

        Ok(borrowed_liquidity)
    }

    pub fn calculate_borrowed_liquidity_in_current_terms(
        &self,
        globalpool: &Account<Globalpool>,
    ) -> Result<u128> {
        let is_borrow_a = self.is_borrow_a(globalpool);
        let borrowed_amount = self.total_borrowed_amount();

        let sqrt_lower_price = sqrt_price_from_tick_index(self.tick_lower_index); // sqrt(p_a)
        let sqrt_upper_price = sqrt_price_from_tick_index(self.tick_upper_index); // sqrt(p_b)

        let tick_current_index = globalpool.tick_current_index;
        let sqrt_current_price = globalpool.sqrt_price;
        let round_up = false;

        let mut liquidity: u128 = 0;

        if tick_current_index < self.tick_lower_index {
            // current tick below position
            liquidity = get_liquidity_delta_a(
                sqrt_lower_price,
                sqrt_upper_price,
                borrowed_amount,
                round_up,
            )?;
        } else if tick_current_index < self.tick_upper_index {
            // current tick inside position
            let liquidity_a = get_liquidity_delta_a(
                sqrt_current_price,
                sqrt_upper_price,
                borrowed_amount,
                round_up,
            )?;
            let liquidity_b = get_liquidity_delta_b(
                sqrt_lower_price,
                sqrt_current_price,
                borrowed_amount,
                round_up,
            )?;
            liquidity = liquidity_a.checked_add(liquidity_b).unwrap();
        } else {
            // current tick above position
            liquidity = get_liquidity_delta_b(
                sqrt_lower_price,
                sqrt_upper_price,
                borrowed_amount,
                round_up,
            )?;
        }

        Ok(liquidity)
    }
}
