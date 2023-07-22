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
#[instruction(params: CloseTradePositionParams)]
pub struct CloseTradePosition<'info> {
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
pub struct CloseTradePositionParams {
    // Jupiter router params
    pub slippage_bps: u16,
    pub platform_fee_bps: u8,
    pub swap_instruction_data: Vec<u8>,
}

pub fn close_trade_position(
    ctx: Context<CloseTradePosition>,
    params: &CloseTradePositionParams,
) -> Result<()> {
    verify_position_authority(&ctx.accounts.position_token_account, &ctx.accounts.owner)?;

    let is_borrow_a =
        ctx.accounts.position.liquidity_mint == ctx.accounts.globalpool.token_mint_a.key();

    let (loan_token_vault, other_token_vault) = if is_borrow_a {
        (&ctx.accounts.token_vault_a, &ctx.accounts.token_vault_b)
    } else {
        (&ctx.accounts.token_vault_b, &ctx.accounts.token_vault_a)
    };

    let (initial_loan_token_balance, initial_other_token_balance) = if is_borrow_a {
        (loan_token_vault.amount, other_token_vault.amount)
    } else {
        (other_token_vault.amount, loan_token_vault.amount)
    };

    //
    // Set up swap from other token to loan token
    //

    let swap_program_id = ctx.remaining_accounts[0].key();

    let mut swap_route_accounts = vec![];
    for account in &ctx.remaining_accounts[1..] {
        // 0th index is router pid
        let is_signer = account.key == &ctx.accounts.globalpool.key();
        swap_route_accounts.push(if account.is_writable {
            AccountMeta::new(*account.key, is_signer)
        } else {
            AccountMeta::new_readonly(*account.key, is_signer)
        });
    }

    //
    // TODO: Validate that the receiver of the token swap is the globalpool's token vault
    //

    //
    // Execute swap
    //

    let swap_instruction = Instruction {
        program_id: swap_program_id,
        accounts: swap_route_accounts,
        data: params.swap_instruction_data.clone(),
    };

    program::invoke_signed(
        &swap_instruction,
        &ctx.remaining_accounts[1..],
        &[&ctx.accounts.globalpool.seeds()],
    )?;

    //
    // Verify swap
    //

    ctx.accounts.token_vault_a.reload()?;
    ctx.accounts.token_vault_b.reload()?;

    // need to borrow immutable reference again after reloading mutable above
    let (loan_token_vault, other_token_vault) = if is_borrow_a {
        (&ctx.accounts.token_vault_a, &ctx.accounts.token_vault_b)
    } else {
        (&ctx.accounts.token_vault_b, &ctx.accounts.token_vault_a)
    };

    let (post_loan_token_balance, post_other_token_balance) = if is_borrow_a {
        (loan_token_vault.amount, other_token_vault.amount)
    } else {
        (other_token_vault.amount, loan_token_vault.amount)
    };

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
    let swapped_amount_in: u128 = post_other_token_balance
        .checked_sub(initial_other_token_balance)
        .unwrap()
        .into();

    let swapped_amount_out: u128 = initial_loan_token_balance
        .checked_sub(post_loan_token_balance)
        .unwrap()
        .into();

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

    Ok(())
}