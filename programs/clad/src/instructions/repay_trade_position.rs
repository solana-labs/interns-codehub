use {
    crate::{
        errors::ErrorCode,
        state::*,
        util::{sort_token_amount_for_loan, verify_position_authority},
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
    solana_program::{instruction::Instruction, program},
};

#[derive(Accounts)]
#[instruction(params: RepayTradePositionParams)]
pub struct RepayTradePosition<'info> {
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
pub struct RepayTradePositionParams {
    // Jupiter router params
    pub slippage_bps: u16,
    pub platform_fee_bps: u8,
    pub swap_instruction_data: Vec<u8>,
}

pub fn repay_trade_position(
    ctx: Context<RepayTradePosition>,
    params: &RepayTradePositionParams,
) -> Result<()> {
    verify_position_authority(&ctx.accounts.position_token_account, &ctx.accounts.owner)?;

    let is_borrow_a = ctx.accounts.position.is_borrow_a(&ctx.accounts.globalpool);

    //
    // WARNING:
    //
    // When using the raw tick_current_index from the globalpool, an attacker can manipulate
    // the tick in tx T and repay the trade position in tx T+1, causing the program to use
    // tick_current_index that is unfavourable to the lender.
    //
    // This won't be problematic for pools with high liquidity, where it costs a lot to exploit,
    // but smaller pools are susceptible to this attack. It's like manipulating the spot price to
    // make an option contract in-the-money right before maturity (ie. option pinning).
    //
    // Potential Mitigation:
    // - Use TWAP of tick_current_index
    //

    let tick_current_index = ctx.accounts.globalpool.tick_current_index;
    let loan_tick_lower_index = ctx.accounts.position.tick_lower_index;
    let loan_tick_upper_index = ctx.accounts.position.tick_upper_index;

    //
    // Consider three cases of repaying (closing) a trade position.
    //
    // Assumptions:
    // - Price is at 1000 USDC/SOL when user swapped USDC to SOL.
    // - User borrowed in the liquidity range (850, 950).
    // - User borrowed 1000 USDC, then swapped it to 1 SOL for *long-SOL* position.
    // - User put in 0.1111 SOL (valued at 111.1 USDC) as collateral.
    // - Trivial slippage and fee incurred for swaps.
    //
    // Let P = SOL price (in USDC) at the time of repayment.
    //
    // (1) P >= 1000
    // Requirement: Repay 1000 USDC.
    // i. Swap at most 1 SOL to 1000 USDC via Jupiter.
    // ii. Repay 1000 USDC to globalpool & claim back full collateral.
    //
    // (2) P \in [950, 1000)
    // Requirement: Repay 1000 USDC.
    // i. Swap 1 SOL to at most 1000 USDC via Jupiter.
    // ii. Take some of SOL collateral and swap to USDC via Jupiter.
    // => Output of (i) & (ii) sums to 1000 USDC.
    // iii. Repay 1000 USDC to globalpool & claim back leftover collateral.
    //
    // (3) P \in (850, 950)
    // Requirement: Repay X USDC and Y SOL.
    // i. Swap < 1 SOL to X USDC via Jupiter.
    // ii. Take some of SOL collateral.
    // => (ii) + leftover from (i) sums to Y SOL.
    // iii. Repay X USDC and Y SOL.
    // iv. Claim back leftover collateral (0.1 SOL - (ii) SOL).
    //
    // (4) P <= 850
    // Requirement: Repay 1.1111 SOL (= 1000 / [(950+850)/2])
    // i. Repay 1 SOL + all of SOL collateral.
    //

    let original_borrowed_liquidity = 

    /*

    let (initial_loan_token_balance, initial_other_token_balance) = sort_token_amount_for_loan(
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_vault_b,
        is_borrow_a,
    );

    //
    // Set up swap from other token to borrowed token
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
        program_id: jupiter_cpi::id(), // == JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB
        accounts: swap_route_accounts,
        data: params.swap_instruction_data.clone(),
    };

    program::invoke_signed(
        &swap_instruction,
        &ctx.remaining_accounts[..],
        &[&ctx.accounts.globalpool.seeds()],
    )?;

    //
    // Verify swap
    //

    // Update token vault amounts
    ctx.accounts.token_vault_a.reload()?;
    ctx.accounts.token_vault_b.reload()?;

    let (post_loan_token_balance, post_other_token_balance) = sort_token_amount_for_loan(
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_vault_b,
        is_borrow_a,
    );

    // 1. Require that Other Token was the swapped to Loan Token.
    // => Loan Token balance should increase
    // => Other Token balance should decrease
    require!(
        initial_loan_token_balance < post_loan_token_balance,
        ErrorCode::InvalidLoanTradeSwapDirection
    );
    require!(
        initial_other_token_balance > post_other_token_balance,
        ErrorCode::InvalidLoanTradeSwapDirection
    );

    // 2. Require that the swap out amount equals the previous liquidity swapped amount.

    // This calculation should come after checking that the balances were modified legally (1).
    let swapped_amount_in = initial_other_token_balance
        .checked_sub(post_other_token_balance)
        .unwrap();

    let swapped_amount_out = post_loan_token_balance
        .checked_sub(initial_loan_token_balance)
        .unwrap();

    require!(
        swapped_amount_out == ctx.accounts.position.liquidity_swapped,
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

    // // Update position's liquidity_available & liquidity_swapped
    // ctx.accounts
    //     .position
    //     .update_liquidity_swapped(swapped_amount_in)?;

    // // Update globalpool's swapped token amount
    // ctx.accounts
    //     .globalpool
    //     .update_liquidity_trade_locked(swapped_amount_out, is_borrow_a)?;
    */

    Ok(())
}
