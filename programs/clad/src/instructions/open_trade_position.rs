use {
    crate::{state::*, util::verify_position_authority},
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

    let is_borrow_a =
        ctx.accounts.position.liquidity_mint == ctx.accounts.globalpool.token_mint_a.key();

    let (initial_loan_token_balance, initial_swapped_token_balance) = if is_borrow_a {
        (
            ctx.accounts.token_vault_a.amount,
            ctx.accounts.token_vault_b.amount,
        )
    } else {
        (
            ctx.accounts.token_vault_b.amount,
            ctx.accounts.token_vault_a.amount,
        )
    };

    //
    // Set up swap
    //

    let swap_program_id = ctx.remaining_accounts[0].key();
    msg!(
        "ctx.remaining.accounts length: {}",
        &ctx.remaining_accounts[..].len()
    );
    msg!("swap_program_id: {}", swap_program_id);

    let mut swap_route_accounts = vec![];
    for account in &ctx.remaining_accounts[1..] {
        // 0th index is router pid
        let is_signer = account.key == &ctx.accounts.globalpool.key();
        msg!("signer account: {} (signer: {})", account.key, is_signer);
        swap_route_accounts.push(if account.is_writable {
            AccountMeta::new(*account.key, is_signer)
        } else {
            AccountMeta::new_readonly(*account.key, is_signer)
        });
    }

    //
    // Execute swap
    //

    msg!("swap_route_accounts length: {}", swap_route_accounts.len());
    msg!(
        "swap_instruction_Data length: {}",
        params.swap_instruction_data.len()
    );

    let swap_instruction = Instruction {
        program_id: swap_program_id,
        accounts: swap_route_accounts,
        // data: swap_route_data,
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

    ctx.accounts.token_vault_a.reload()?;
    ctx.accounts.token_vault_b.reload()?;

    let (post_loan_token_balance, post_swapped_token_balance) = if is_borrow_a {
        (
            ctx.accounts.token_vault_a.amount,
            ctx.accounts.token_vault_b.amount,
        )
    } else {
        (
            ctx.accounts.token_vault_b.amount,
            ctx.accounts.token_vault_a.amount,
        )
    };

    msg!("initial_loan_token_balance: {}", initial_loan_token_balance);
    msg!(
        "initial_swapped_token_balance: {}",
        initial_swapped_token_balance
    );
    msg!("post_loan_token_balance: {}", post_loan_token_balance);
    msg!("post_swapped_token_balance: {}", post_swapped_token_balance);

    //
    // Post-swap Update
    //

    // Update position's liquidity_available & liquidity_swapped

    Ok(())
}
