use {
    crate::{
        errors::ErrorCode,
        manager::{
            liquidity_manager, loan_manager, swap_manager::execute_jupiter_swap_for_globalpool,
        },
        math::*,
        state::*,
        util::{
            mint_position_token_and_remove_authority, sort_token_amount_for_loan,
            transfer_from_owner_to_vault,
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
};

#[derive(Accounts)]
#[instruction(params: OpenTradePositionParams)]
pub struct OpenTradePosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
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

    #[account(
        init,
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

    #[account(mut, token::mint = globalpool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(address = globalpool.token_mint_a)]
    pub token_mint_a: Box<Account<'info, Mint>>,

    #[account(mut, token::mint = globalpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(address = globalpool.token_mint_b)]
    pub token_mint_b: Box<Account<'info, Mint>>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_lower: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_upper: AccountLoader<'info, TickArray>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    // For pyth
    // pub clock: Sysvar<'info, Clock>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OpenTradePositionParams {
    // Token A or B amount to borrow (in liquidity)
    pub liquidity_amount: u128,

    // If borrow_a, we traverse Ticks to the right (positive) from this index, inclusive (a_to_b = False).
    // Conversely, if !borrow_a, we traverse to the left (negative) from this index, inclusive.
    pub tick_lower_index: i32,
    pub tick_upper_index: i32,

    // Lifetime of loan, in seconds
    pub loan_duration: u64,

    // true: borrow token A | false: borrow token B
    pub borrow_a: bool,

    pub swap_instruction_data: Vec<u8>, // Jupiter router data
}

pub fn open_trade_position<'info>(
    ctx: Context<OpenTradePosition>,
    params: &OpenTradePositionParams,
) -> Result<()> {
    let position_mint = &ctx.accounts.position_mint;

    let current_tick_index = ctx.accounts.globalpool.tick_current_index;

    if params.liquidity_amount == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }

    // Loan must be at least 1 hour long and at most 10 days
    if params.loan_duration < 3600 || params.loan_duration > 864_000 {
        return Err(ErrorCode::InvalidLoanDuration.into());
    }

    if ctx.accounts.position_token_account.amount > 0 {
        return Err(ProgramError::AccountAlreadyInitialized.into());
    }

    if params.tick_lower_index > params.tick_upper_index {
        return Err(ErrorCode::InvalidTickRange.into());
    }

    // Require that both TickArrays (from which token liquidity is borrowed) are either
    // below or above the current globalpool tick since a trader can only borrow one asset.
    if (params.tick_lower_index < current_tick_index
        && params.tick_upper_index > current_tick_index)
        || (params.tick_upper_index == current_tick_index)
        || (params.tick_lower_index == current_tick_index)
    {
        return Err(ErrorCode::InvalidTickRangeAgainstCurrentTick.into());
    }

    // Require that if borrow_a = true, then the Ticks are ABOVE the current globalpool tick.
    // Conversely, if borrow_a = false, then the Ticks are BELOW the current globalpool tick.
    if (params.borrow_a && params.tick_lower_index < current_tick_index)
        || (!params.borrow_a && params.tick_upper_index > current_tick_index)
    {
        return Err(ErrorCode::InvalidTickRangeAgainstBorrowCondition.into());
    }

    let liquidity_delta = convert_to_liquidity_delta(u128::from(params.liquidity_amount), true)?;

    msg!("Requesting loan");

    //
    // 1. Initialize & mint the trade position
    //

    ctx.accounts.position.init_position(
        &ctx.accounts.globalpool,
        position_mint.key(),
        u128::from(params.liquidity_amount),
        params.tick_lower_index,
        params.tick_upper_index,
        params.loan_duration,
        0, // to be updated later
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
    // WARNING: Must come after `position.init_position()` because it uses the position data.
    //

    let (token_borrow_amount, is_borrow_token_a) =
        loan_manager::calculate_loan_liquidity_token_delta(
            current_tick_index,
            params.tick_lower_index,
            params.tick_upper_index,
            liquidity_delta,
        )?;
    let is_collateral_token_a = !is_borrow_token_a;

    require!(
        is_borrow_token_a == params.borrow_a,
        ErrorCode::InvalidLoanParameters
    );

    let update = loan_manager::calculate_modify_loan(
        &ctx.accounts.globalpool,
        &ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        liquidity_delta,
        token_borrow_amount as i64,
    )?;

    //
    // 3. Check collateral.
    // Note: Borrowing Token B in A/B pool (e.g. SOL/USDC) means depositing Token A as collateral.
    //

    let collateral_token_owner_account;
    let collateral_token_mint;
    let borrowed_token_mint;
    if is_collateral_token_a {
        collateral_token_owner_account = &ctx.accounts.token_owner_account_a;
        collateral_token_mint = &ctx.accounts.token_mint_a;
        borrowed_token_mint = &ctx.accounts.token_mint_b;
    } else {
        collateral_token_owner_account = &ctx.accounts.token_owner_account_b;
        collateral_token_mint = &ctx.accounts.token_mint_b;
        borrowed_token_mint = &ctx.accounts.token_mint_a;
    };

    ctx.accounts
        .position
        .update_position_mints(borrowed_token_mint.key(), collateral_token_mint.key());

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
        &mut ctx.accounts.position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        &update,
    )?;

    //
    // =========================
    //        Open Trade
    // =========================
    //

    msg!("Opening trade position from loan");

    let (initial_loan_vault_balance, initial_swapped_vault_balance) = sort_token_amount_for_loan(
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_vault_b,
        is_borrow_token_a,
    );

    //
    // TODO: Validate that the receiver of the token swap is the globalpool's token vault
    //

    execute_jupiter_swap_for_globalpool(
        &ctx.accounts.globalpool,
        &ctx.remaining_accounts,
        &params.swap_instruction_data,
    )?;

    //
    // Verify swap
    //

    // Update token vault amounts
    ctx.accounts.token_vault_a.reload()?;
    ctx.accounts.token_vault_b.reload()?;

    let (post_loan_vault_balance, post_swapped_vault_balance) = sort_token_amount_for_loan(
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_vault_b,
        is_borrow_token_a,
    );

    // 1. Require that Loan (Borrowed) Token was the swapped to Swapped Token.
    // => Loan Token balance should decrease
    // => Swapped Token balance should increase
    require!(
        initial_loan_vault_balance > post_loan_vault_balance,
        ErrorCode::InvalidLoanTradeSwapDirection
    );
    require!(
        initial_swapped_vault_balance < post_swapped_vault_balance,
        ErrorCode::InvalidLoanTradeSwapDirection
    );

    // 2. Require that the Loan Token amount was decreased by at most
    //    position.liquidity_available.

    // This calculation should come after checking that the balances were modified legally (1).
    let swapped_amount_in = initial_loan_vault_balance
        .checked_sub(post_loan_vault_balance)
        .unwrap();

    let swapped_amount_out = post_swapped_vault_balance
        .checked_sub(initial_swapped_vault_balance)
        .unwrap();

    require!(
        swapped_amount_in <= ctx.accounts.position.loan_token_available,
        ErrorCode::InvalidLoanTradeSwapResult
    );

    // 3. Require that the tokens were deposited the right amount.
    //

    //
    // TODO: Must implement this to make sure that the user did not swap to an external account.
    //
    // NOTE: Verify the swap instruction data as well (by slicing and matching numbers).
    //

    // require!(
    //     post_swapped_token_balance,
    //     ErrorCode::InvalidLoanTradeSwapResult
    // );

    //
    // Post-swap Update
    //

    // Update position's liquidity_available & liquidity_swapped
    ctx.accounts
        .position
        .update_liquidity_swapped(swapped_amount_in as i64, swapped_amount_out as i64)?;

    // Require that ALL amount of the loan token was swapped.
    require!(
        ctx.accounts.position.loan_token_available == 0,
        ErrorCode::InvalidLoanTradeSwapResult
    );

    //
    // Collateral calculation
    //

    // Collateral = Worst case value (loss) - swapped out token amount

    let collateral_amount = loan_manager::calculate_collateral(
        params.liquidity_amount,
        params.tick_lower_index,
        params.tick_upper_index,
        swapped_amount_out,
        is_borrow_token_a,
    )?;

    let collateral_token_vault = if is_collateral_token_a {
        &ctx.accounts.token_vault_a
    } else {
        &ctx.accounts.token_vault_b
    };

    // Transfer collateral from trader to vault
    transfer_from_owner_to_vault(
        &ctx.accounts.owner,
        &collateral_token_owner_account,
        &collateral_token_vault,
        &ctx.accounts.token_program,
        collateral_amount,
    )?;

    ctx.accounts
        .position
        .update_collateral_amount(collateral_amount);

    //
    // Interest payment on opening the trade position (ie. on loan)
    //

    //
    // Calculate & transfer prorated interest from trader to vault (in collateral token).
    // NOTE: This must come after the collateral calculation because it uses the collateral amount
    // TODO: Allow payment of interest in borrowed token as well.
    //

    let is_interest_fee_in_a = is_collateral_token_a;

    let interest_fee_token_owner_account;
    let interest_fee_token_vault;
    let interest_fee_multiplier_amount = collateral_amount; // x% of this amount = interest rate fee

    // follows the collateral_token_vault pattern, but modifiable later
    if is_interest_fee_in_a {
        interest_fee_token_owner_account = &ctx.accounts.token_owner_account_a;
        interest_fee_token_vault = &ctx.accounts.token_vault_a;
    } else {
        interest_fee_token_owner_account = &ctx.accounts.token_owner_account_b;
        interest_fee_token_vault = &ctx.accounts.token_vault_b;
    }

    let annual_interest_amount = interest_fee_multiplier_amount
        .checked_mul(update.loan_interest_annual_bps as u64)
        .unwrap();

    let prorated_interest_amount = annual_interest_amount
        .checked_mul(params.loan_duration as u64)
        .unwrap()
        .checked_div(3_153_600_000) // 31,536,000 sec per yr * 100 bps per 1% (ignore leap years)
        .unwrap();

    msg!("collateral_amount: {}", collateral_amount);
    msg!(
        "loan_interst_annual_bps, {}",
        update.loan_interest_annual_bps
    );
    msg!("annual_interest_amount: {}", annual_interest_amount);
    msg!("prorated_interest_amount: {}", prorated_interest_amount);

    transfer_from_owner_to_vault(
        &ctx.accounts.owner,
        interest_fee_token_owner_account,
        interest_fee_token_vault,
        &ctx.accounts.token_program,
        prorated_interest_amount,
    )?;

    //
    // Add the interest fee to the pool fee growth (for LP payout)
    //

    ctx.accounts.globalpool.update_after_loan(
        liquidity_delta,
        prorated_interest_amount, 
        is_interest_fee_in_a
    );

    Ok(())
}
