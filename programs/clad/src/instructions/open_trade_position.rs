use {
    crate::{errors::ErrorCode, state::*, util::verify_position_authority},
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
    solana_program::{instruction::Instruction, program},
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
    let available_collateral_amount = ctx.accounts.position.collateral_amount;

    let (borrowed_token_vault, collateral_token_vault) = if is_borrow_a {
        (&ctx.accounts.token_vault_a, &ctx.accounts.token_vault_b)
    } else {
        (&ctx.accounts.token_vault_b, &ctx.accounts.token_vault_a)
    };

    let (initial_loan_vault_balance, initial_swapped_vault_balance) = if is_borrow_a {
        (borrowed_token_vault.amount, collateral_token_vault.amount)
    } else {
        (collateral_token_vault.amount, borrowed_token_vault.amount)
    };

    //
    // Set up swap
    //

    // 0th index is router pid, so skip it
    let swap_route_accounts: Vec<AccountMeta> = (&ctx.remaining_accounts[1..])
        .iter()
        .map(|acct| {
            let is_signer = acct.key == &ctx.accounts.globalpool.key();
            if acct.is_writable {
                AccountMeta::new(*acct.key, is_signer)
            } else {
                AccountMeta::new_readonly(*acct.key, is_signer)
            }
        })
        .collect();

    //
    // TODO: Validate that the receiver of the token swap is the globalpool's token vault
    //

    //
    // Execute swap
    //

    let swap_instruction = Instruction {
        // Jupiter Program ID hard-coded in the program for now
        program_id: jupiter_cpi::id(), // == JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB
        accounts: swap_route_accounts,
        data: params.swap_instruction_data.clone(),
    };

    program::invoke_signed(
        &swap_instruction,
        &ctx.remaining_accounts[..], // all accounts are for swap (incl Jupiter account)
        &[&ctx.accounts.globalpool.seeds()],
    )?;

    //
    // Verify swap
    //

    ctx.accounts.token_vault_a.reload()?;
    ctx.accounts.token_vault_b.reload()?;

    // need to borrow immutable reference again after reloading the mutable ref above
    let (borrowed_token_vault, collateral_token_vault) = if is_borrow_a {
        (&ctx.accounts.token_vault_a, &ctx.accounts.token_vault_b)
    } else {
        (&ctx.accounts.token_vault_b, &ctx.accounts.token_vault_a)
    };

    let (post_loan_vault_balance, post_swapped_vault_balance) = if is_borrow_a {
        (borrowed_token_vault.amount, collateral_token_vault.amount)
    } else {
        (collateral_token_vault.amount, borrowed_token_vault.amount)
    };

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
    msg!("position.liquidity_available: {}", ctx.accounts.position.liquidity_available);
    msg!("position.collateral_amount: {}", ctx.accounts.position.collateral_amount);

    require!(
        swapped_amount_in <= ctx.accounts.position.liquidity_available,
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
        .update_liquidity_swapped(swapped_amount_in)?;

    // Update globalpool's swapped token amount
    ctx.accounts
        .globalpool
        .update_liquidity_trade_locked(swapped_amount_out, is_borrow_a)?;

    Ok(())
}
