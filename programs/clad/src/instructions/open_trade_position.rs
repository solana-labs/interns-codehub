use {
    crate::{
        errors::ErrorCode,
        manager::{liquidity_manager::sync_modify_liquidity_values_from_loan, loan_manager},
        math::convert_to_liquidity_delta,
        state::*,
        util::{mint_position_token_and_remove_authority, to_timestamp_u64},
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
    jupiter_cpi::{
        self,
        jupiter_override::{Route, Swap, SwapLeg},
    },
    solana_program::{instruction::Instruction, program},
};

#[derive(Accounts)]
#[instruction(params: OpenTradePositionParams)]
pub struct OpenTradePosition<'info> {
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

    #[account(mut, constraint = token_owner_account_b.mint == globalpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = globalpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

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
pub struct OpenTradePositionParams {
    // Token A or B amount to borrow
    pub liquidity_amount: u64,

    // If borrow_a, we traverse Ticks to the right (positive) from this index, inclusive (a_to_b = False).
    // Conversely, if !borrow_a, we traverse to the left (negative) from this index, inclusive.
    pub tick_lower_index: i32,
    pub tick_upper_index: i32,

    // true: borrow token A | false: borrow token B
    pub borrow_a: bool,

    // Jupiter router params
    pub slippage_bps: u16,
    pub platform_fee_bps: u8,
}

pub fn open_trade_position(
    ctx: Context<OpenTradePosition>,
    params: &OpenTradePositionParams,
) -> Result<()> {
    let globalpool = &ctx.accounts.globalpool;
    let position_mint = &ctx.accounts.position_mint;
    let position = &mut ctx.accounts.position;
    // let token_vault_a = &ctx.accounts.token_vault_a;
    // let token_vault_b = &ctx.accounts.token_vault_b;

    if params.liquidity_amount == 0 {
        return Err(ErrorCode::LiquidityZero.into());
    }

    if ctx.accounts.position_token_account.amount > 0 {
        return Err(ProgramError::AccountAlreadyInitialized.into());
    }

    if params.tick_lower_index > params.tick_upper_index {
        return Err(ProgramError::InvalidInstructionData.into());
    }

    // Require that both TickArrays (from which token liquidity is borrowed) are either
    // below or above the current globalpool tick since a trader can only borrow one asset.
    if (params.tick_lower_index < globalpool.tick_current_index
        && params.tick_upper_index > globalpool.tick_current_index)
        || (params.tick_upper_index == globalpool.tick_current_index)
        || (params.tick_lower_index == globalpool.tick_current_index)
    {
        return Err(ProgramError::InvalidInstructionData.into());
    }

    //
    // 1. Initialize & mint the trade position
    //
    position.open_position(
        globalpool,
        position_mint.key(),
        params.tick_lower_index,
        params.tick_upper_index,
    )?;

    mint_position_token_and_remove_authority(
        globalpool,
        position_mint,
        &ctx.accounts.position_token_account,
        &ctx.accounts.token_program,
    );

    //
    // 2. Increase the position's loan liquidity
    //
    // TODO: Right now, the trade position takes out loan from only the passesd-in
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

    let liquidity_delta = convert_to_liquidity_delta(u128::from(params.liquidity_amount), false)?;
    let timestamp = to_timestamp_u64(Clock::get()?.unix_timestamp)?;

    let update = loan_manager::calculate_modify_loan(
        globalpool,
        position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        liquidity_delta,
        timestamp,
    )?;

    sync_modify_liquidity_values_from_loan(
        &mut ctx.accounts.globalpool,
        position,
        &ctx.accounts.tick_array_lower,
        &ctx.accounts.tick_array_upper,
        update,
    )?;

    //
    // Set up swap
    //
    let (initial_loan_token_balance, initial_swapped_token_balance) = if params.borrow_a {
        (
            &ctx.accounts.token_vault_a.amount,
            &ctx.accounts.token_vault_b.amount,
        )
    } else {
        (
            &ctx.accounts.token_vault_b.amount,
            &ctx.accounts.token_vault_a.amount,
        )
    };

    let mut router_accounts = vec![];
    for account in &ctx.remaining_accounts[..] {
        let is_signer = account.key == &ctx.accounts.globalpool.key();
        router_accounts.push(if account.is_writable {
            AccountMeta::new(*account.key, is_signer)
        } else {
            AccountMeta::new_readonly(*account.key, is_signer)
        });
    }

    // Swap
    /*
    program::invoke_signed(
        &Instruction {
            program_id: jupiter_cpi::ID,
            accounts: router_accounts,
            data: Route {
                swap_leg: SwapLeg::Swap {
                    swap: Swap::Whirlpool { a_to_b: true },
                },
                in_amount: params.liquidity_amount,
                quoted_out_amount: 0,
                slippage_bps: params.slippage_bps,
                platform_fee_bps: params.platform_fee_bps,
            }
            .data(),
        },
        &ctx.remaining_accounts[..],
        &[&globalpool.seeds()],
    )?; */

    //
    // Verify swap
    //
    ctx.accounts.token_vault_a.reload()?;
    ctx.accounts.token_vault_b.reload()?;

    let (post_loan_token_balance, post_swapped_token_balance) = if params.borrow_a {
        (
            &ctx.accounts.token_vault_a.amount,
            &ctx.accounts.token_vault_b.amount,
        )
    } else {
        (
            &ctx.accounts.token_vault_b.amount,
            &ctx.accounts.token_vault_a.amount,
        )
    };

    // transfer_from_vault_to_owner(
    //     globalpool,
    //     withdrawal_account_pool,
    //     withdrawal_account_user,
    //     token_program,
    //     withdrawal_amount,
    // )?;

    Ok(())
}
