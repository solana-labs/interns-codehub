use {
    crate::{
        manager::loan_manager,
        state::*,
        util::{mint_position_token_and_remove_authority, TickSequence},
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

    #[account(mut, has_one = globalpool)]
    pub tick_array_0: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_1: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = globalpool)]
    pub tick_array_2: AccountLoader<'info, TickArray>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct OpenTradePositionParams {
    // Token A or B amount to borrow
    pub amount: u64,

    // Tick Index to start searching liquidity from.
    // If borrow_a, we traverse Ticks to the right (positive) from this index, inclusive (a_to_b = False).
    // Conversely, if !borrow_a, we traverse to the left (negative) from this index, inclusive.
    pub start_tick_index: i32,

    // true: borrow token A | false: borrow token B
    pub borrow_a: bool,
}

pub fn open_trade_position(
    ctx: Context<OpenTradePosition>,
    params: &OpenTradePositionParams,
) -> Result<()> {
    let globalpool = &ctx.accounts.globalpool;
    let position_mint = &ctx.accounts.position_mint;
    let position = &mut ctx.accounts.position;

    let mut loan_tick_sequence = TickSequence::new(
        ctx.accounts.tick_array_0.load_mut().unwrap(),
        ctx.accounts.tick_array_1.load_mut().ok(),
        ctx.accounts.tick_array_2.load_mut().ok(),
    );

    // Calculate Ticks touched for loans
    let tick_loans = loan_manager::calculate_borrowed_ticks(
        globalpool,
        &mut loan_tick_sequence,
        params.amount,
        params.start_tick_index,
        params.borrow_a,
    )?;

    // let (loan_update, tick_loans) = loan_manager::borrow(
    //     globalpool,
    //     &mut loan_tick_sequence,
    //     params.amount,
    //     params.start_tick_index,
    //     params.borrow_a,
    // )?;

    // borrow_and_update_globalpool()

    // position.open_position(globalpool, &params.ticks, params.borrow_a);

    todo!()
}
