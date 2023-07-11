use {
    crate::state::*,
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount},
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
        init,
        payer = funder,
        token::mint = token_mint_a,
        token::authority = globalpool // transfer_authority
    )]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = funder,
        token::mint = token_mint_b,
        token::authority = globalpool // transfer_authority
    )]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

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
    )?)
}
