use {
    crate::state::*,
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
};

#[derive(Accounts)]
#[instruction(params: CreatePoolParams)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    #[account(
        seeds = [b"clad"],
        bump = clad.clad_bump,
    )]
    pub clad: Box<Account<'info, Clad>>,

    #[account(
        init,
        seeds = [
            b"globalpool".as_ref(),
            token_mint_a.key().as_ref(),
            token_mint_b.key().as_ref(),
            params.fee_rate.to_le_bytes().as_ref(),
            params.tick_spacing.to_le_bytes().as_ref(),
        ],
        bump,
        payer = funder,
        space = Globalpool::LEN
    )]
    pub globalpool: Box<Account<'info, Globalpool>>,

    pub token_mint_a: Account<'info, Mint>,

    pub token_mint_b: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = funder,
        constraint = token_mint_a.key() == token_vault_a.mint,
        associated_token::mint = token_mint_a,
        associated_token::authority = globalpool
    )]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = funder,
        constraint = token_mint_b.key() == token_vault_b.mint,
        associated_token::mint = token_mint_b,
        associated_token::authority = globalpool
    )]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    // Need to read from Pyth to calculate collateral amount. We read both Token A and B since 
    // the prices are returned in USD and we calculate collateral denominated in either token A or B.
    // pub token_price_feed_a: Account<'info, PriceFeed>,
    // pub token_price_feed_b: Account<'info, PriceFeed>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreatePoolParams {
    pub fee_rate: u16,
    pub tick_spacing: u16,
    pub initial_sqrt_price: u128,
}

pub fn create_pool(ctx: Context<CreatePool>, params: &CreatePoolParams) -> Result<()> {
    let clad = &ctx.accounts.clad;

    let globalpool = &mut ctx.accounts.globalpool;
    let globalpool_bump = *ctx
        .bumps
        .get("globalpool")
        .ok_or(ProgramError::InvalidSeeds)?;

    Ok(globalpool.initialize(
        globalpool_bump,
        params.tick_spacing,
        params.initial_sqrt_price,
        params.fee_rate,
        clad.protocol_fee_rate,
        ctx.accounts.funder.key(),
        ctx.accounts.token_mint_a.key(),
        ctx.accounts.token_vault_a.key(),
        ctx.accounts.token_mint_b.key(),
        ctx.accounts.token_vault_b.key(),
        // ctx.accounts.token_price_feed_a.key(),
        // ctx.accounts.token_price_feed_b.key(),
    )?)
}
