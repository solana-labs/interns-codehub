use {
    crate::{
        errors::ErrorCode,
        manager::swap_manager::execute_jupiter_swap_for_globalpool,
        state::*,
        util::{sort_token_amount_for_loan, verify_position_authority},
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

    pub globalpool: Box<Account<'info, Globalpool>>,

    #[account(mut, has_one = globalpool)]
    pub position: Box<Account<'info, TradePosition>>,

    #[account(
        associated_token::mint = position.position_mint,
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

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OpenTradePositionParams {
    // Jupiter router params
    pub slippage_bps: u16,
    pub platform_fee_bps: u8,
    pub swap_instruction_data: Vec<u8>,
}

pub fn open_trade_position(
    ctx: Context<OpenTradePosition>,
    params: &OpenTradePositionParams,
) -> Result<()> {
    verify_position_authority(&ctx.accounts.position_token_account, &ctx.accounts.owner)?;

    let is_borrow_a = ctx.accounts.position.is_borrow_a(&ctx.accounts.globalpool);

    let (initial_loan_vault_balance, initial_swapped_vault_balance) = sort_token_amount_for_loan(
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_vault_b,
        is_borrow_a,
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
        is_borrow_a,
    );

    // 1. Require that Loan (Borrowed) Token was the swapped to Swapped Token.
    // => Loan Token balance should decrease
    // => Swapped Token balance should increase
    msg!("initial_loan_vault_balance: {}", initial_loan_vault_balance);
    msg!("post_loan_vault_balance: {}", post_loan_vault_balance);
    msg!(
        "initial_swapped_vault_balance: {}",
        initial_swapped_vault_balance
    );
    msg!("post_swapped_vault_balance: {}", post_swapped_vault_balance);
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
    msg!("swapped_amount_in: {}", swapped_amount_in);
    msg!("swapped_amount_out: {}", swapped_amount_out);
    msg!(
        "position.loan_token_available: {}",
        ctx.accounts.position.loan_token_available
    );
    msg!(
        "position.collateral_amount: {}",
        ctx.accounts.position.collateral_amount
    );

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

    msg!("diff loan_token_balance: {}", swapped_amount_in);
    msg!("diff swapped_token_balance: {}", swapped_amount_out);

    //
    // Post-swap Update
    //

    // Update position's liquidity_available & liquidity_swapped
    ctx.accounts
        .position
        .update_liquidity_swapped(swapped_amount_in, swapped_amount_out)?;

    // Require that ALL amount of the loan token was swapped.
    require!(
        ctx.accounts.position.loan_token_available == 0,
        ErrorCode::InvalidLoanTradeSwapResult
    );

    // Update globalpool's swapped token amount
    ctx.accounts
        .globalpool
        .update_liquidity_trade_locked(ctx.accounts.position.liquidity_borrowed)?;

    Ok(())
}
