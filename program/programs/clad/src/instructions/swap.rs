use {
    crate::{
        errors::ErrorCode,
        manager::swap_manager::*,
        state::{Globalpool, TickArray},
        util::{update_and_swap_globalpool, TickSequence},
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub token_authority: Signer<'info>,

    #[account(mut)]
    pub globalpool: Box<Account<'info, Globalpool>>,

    #[account(mut, constraint = token_owner_account_a.mint == globalpool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = globalpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_b.mint == globalpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = globalpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_0: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_1: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_2: AccountLoader<'info, TickArray>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SwapParams {
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit: u128,
    amount_specified_is_input: bool,
    a_to_b: bool, // Zero for one
}

pub fn swap(ctx: Context<Swap>, params: &SwapParams) -> Result<()> {
    let globalpool = &mut ctx.accounts.globalpool;
    let clock = Clock::get()?;

    // let timestamp = to_timestamp_u64(clock.unix_timestamp)?;
    let mut swap_tick_sequence = TickSequence::new(
        ctx.accounts.tick_array_0.load_mut().unwrap(),
        ctx.accounts.tick_array_1.load_mut().ok(),
        ctx.accounts.tick_array_2.load_mut().ok(),
    );

    let amount_specified_is_input = params.amount_specified_is_input;
    let a_to_b = params.a_to_b;

    let swap_update = swap_manager::swap(
        &globalpool,
        &mut swap_tick_sequence,
        params.amount,
        params.sqrt_price_limit,
        amount_specified_is_input,
        a_to_b,
    )?;

    if amount_specified_is_input {
        if (a_to_b && other_amount_threshold > swap_update.amount_b)
            || (!a_to_b && other_amount_threshold > swap_update.amount_a)
        {
            return Err(ErrorCode::AmountOutBelowMinimum.into());
        }
    } else {
        if (a_to_b && other_amount_threshold < swap_update.amount_a)
            || (!a_to_b && other_amount_threshold < swap_update.amount_b)
        {
            return Err(ErrorCode::AmountInAboveMaximum.into());
        }
    }

    update_and_swap_globalpool(
        globalpool,
        &ctx.accounts.token_authority,
        &ctx.accounts.token_owner_account_a,
        &ctx.accounts.token_owner_account_b,
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_vault_b,
        &ctx.accounts.token_program,
        swap_update,
        a_to_b,
    )
}
