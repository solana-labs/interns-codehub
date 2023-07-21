use {
    crate::{
        errors::ErrorCode,
        manager::{liquidity_manager, loan_manager},
        math::*,
        state::*,
        util::{mint_position_token_and_remove_authority, transfer_from_owner_to_vault},
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
};

#[derive(Accounts)]
#[instruction(params: OpenLoanPositionParams)]
pub struct OpenLoanPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub globalpool: Box<Account<'info, Globalpool>>,

    #[account(
			init,
			payer = owner,
			space = TradePosition::LEN,
			seeds = [
					b"trade_position".as_ref(),
					position_mint.key().as_ref()
			],
			bump,
	)]
    pub position: Box<Account<'info, TradePosition>>,

    #[account(init,
			payer = owner,
			mint::authority = globalpool,
			mint::decimals = 0,
	)]
    pub position_mint: Account<'info, Mint>,

    #[account(
			init,
			payer = owner,
			associated_token::mint = position_mint,
			associated_token::authority = owner,
	)]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_a.mint == globalpool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(address = globalpool.token_mint_a)]
    pub token_mint_a: Box<Account<'info, Mint>>,

    #[account(mut, constraint = token_owner_account_b.mint == globalpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(address = globalpool.token_mint_b)]
    pub token_mint_b: Box<Account<'info, Mint>>,

    //
    // NOTE: Read `2. TODO` below for the reason of these commented out lines.
    //
    // #[account(mut, has_one = globalpool)]
    // pub tick_array_0: AccountLoader<'info, TickArray>,
    // #[account(mut, has_one = globalpool)]
    // pub tick_array_1: AccountLoader<'info, TickArray>,
    // #[account(mut, has_one = globalpool)]
    // pub tick_array_2: AccountLoader<'info, TickArray>,
    #[account(mut, has_one = globalpool)]
    pub tick_array_lower: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_upper: AccountLoader<'info, TickArray>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct OpenLoanPositionParams {
    // Token A or B amount to borrow
    pub liquidity_amount: u64,

    // If borrow_a, we traverse Ticks to the right (positive) from this index, inclusive (a_to_b = False).
    // Conversely, if !borrow_a, we traverse to the left (negative) from this index, inclusive.
    pub tick_lower_index: i32,
    pub tick_upper_index: i32,

    // true: borrow token A | false: borrow token B
    pub borrow_a: bool,
}

pub fn open_loan_position(
    ctx: Context<OpenLoanPosition>,
    params: &OpenLoanPositionParams,
) -> Result<()> {
    // let globalpool = &ctx.accounts.globalpool;
    let position_mint = &ctx.accounts.position_mint;
    let position = &mut ctx.accounts.position;
    // let token_vault_a = &ctx.accounts.token_vault_a;
    // let token_vault_b = &ctx.accounts.token_vault_b;

    let tick_current_index = ctx.accounts.globalpool.tick_current_index;

    if params.liquidity_amount == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }

    if ctx.accounts.position_token_account.amount > 0 {
        return Err(ProgramError::AccountAlreadyInitialized.into());
    }

    if params.tick_lower_index > params.tick_upper_index {
        return Err(ErrorCode::InvalidTickRange.into());
    }

    // Require that both TickArrays (from which token liquidity is borrowed) are either
    // below or above the current globalpool tick since a trader can only borrow one asset.
    if (params.tick_lower_index < tick_current_index
        && params.tick_upper_index > tick_current_index)
        || (params.tick_upper_index == tick_current_index)
        || (params.tick_lower_index == tick_current_index)
    {
        return Err(ErrorCode::InvalidTickRangeAgainstCurrentTick.into());
    }

    // Require that if borrow_a = true, then the Ticks are ABOVE the current globalpool tick.
    // Conversely, if borrow_a = false, then the Ticks are BELOW the current globalpool tick.
    if (params.borrow_a && params.tick_lower_index < tick_current_index)
        || (!params.borrow_a && params.tick_upper_index > tick_current_index)
    {
        return Err(ErrorCode::InvalidTickRangeAgainstBorrowCondition.into());
    }

    let liquidity_delta = convert_to_liquidity_delta(u128::from(params.liquidity_amount), false)?;

    //
    // 1. Initialize & mint the trade position
    //

    position.init_position(
        &ctx.accounts.globalpool,
        position_mint.key(),
        params.tick_lower_index,
        params.tick_upper_index,
    )?;

    mint_position_token_and_remove_authority(
        &ctx.accounts.globalpool,
        position_mint,
        &ctx.accounts.position_token_account,
        &ctx.accounts.token_program,
    )?;

    //
    // 2. Get liquidity from ticks (fails if insufficient liquidity for loan)
    //

    let update = loan_manager::calculate_modify_loan(
        &ctx.accounts.globalpool,
        position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        liquidity_delta,
    )?;

    //
    // 3. Check collateral.
    //
    // Note 1: Must come after initializing the position, as it uses the position data.
    // Note 2: Borrowng Token B in A/B pool (e.g. SOL/USDC) means depositing Token A as collateral.
    //

    let (
        token_borrow_amount,
        is_collateral_token_a,
        is_borrow_token_a,
        lower_sqrt_price,
        upper_sqrt_price,
    ) = loan_manager::calculate_loan_liquidity_token_delta(
        tick_current_index,
        position,
        liquidity_delta,
    )?;

    let (
        collateral_token_owner_account,
        collateral_token_vault,
        collateral_token_mint,
        borrowed_token_owner_account,
        borrowed_token_vault,
        borrowed_token_mint,
    ) = if is_collateral_token_a {
        (
            &ctx.accounts.token_owner_account_a,
            &ctx.accounts.token_vault_a,
            &ctx.accounts.token_mint_a,
            &ctx.accounts.token_owner_account_b,
            &ctx.accounts.token_vault_b,
            &ctx.accounts.token_mint_b,
        )
    } else {
        (
            &ctx.accounts.token_owner_account_b,
            &ctx.accounts.token_vault_b,
            &ctx.accounts.token_mint_b,
            &ctx.accounts.token_owner_account_a,
            &ctx.accounts.token_vault_a,
            &ctx.accounts.token_mint_a,
        )
    };

    let collateral_amount = loan_manager::calculate_collateral(
        token_borrow_amount,
        is_borrow_token_a,
        is_collateral_token_a,
        borrowed_token_mint.decimals,
        collateral_token_mint.decimals,
        collateral_token_owner_account.amount,
        lower_sqrt_price,
        upper_sqrt_price,
    )?;

    position.update_position_mints(borrowed_token_mint.key(), collateral_token_mint.key())?;
    position.update_collateral_amount(collateral_amount)?;

    transfer_from_owner_to_vault(
        &ctx.accounts.owner,
        collateral_token_owner_account,
        collateral_token_vault,
        &ctx.accounts.token_program,
        collateral_amount,
    )?;

    //
    // 4. Increase the position's loan liquidity
    //
    // TODO: Right now, the trade position takes out loan (liquidity) from only the passesd-in
    //       `lower_tick` and `upper_tick`. Ideally, we want to traverse all initialized
    //       Ticks within the range [lower_tick, upper_tick) and extract liquidity as
    //       uniformly as possible so that the strike price of the loan will be the mean.
    //

    // TODO: Initialize TickSequence with TickArray containing `lower_tick` as the 0th array
    //       and TickArray containing `upper_tick` as the 2nd array. So, like `swap`, the
    //       the liquidity will be drained by traversing the sequence.
    // let mut loan_tick_sequence = TickSequence::new(
    //     ctx.accounts.tick_array_0.load_mut().unwrap(),
    //     ctx.accounts.tick_array_1.load_mut().ok(),
    //     ctx.accounts.tick_array_2.load_mut().ok(),
    // );

    liquidity_manager::sync_modify_liquidity_values_for_loan(
        &mut ctx.accounts.globalpool,
        position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        update,
    )?;

    Ok(())
}
