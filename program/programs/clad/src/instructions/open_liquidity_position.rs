use {
    crate::{state::*, util::mint_position_token_and_remove_authority},
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
};

#[derive(Accounts)]
#[instruction(params: OpenLiquidityPositionParams)]
pub struct OpenLiquidityPosition<'info> {
    // Funder is the owner for now
    #[account(mut)]
    pub position_authority: Signer<'info>,

    /// CHECK: safe, the account that will be the owner of the liquidity position can be arbitrary
    // pub owner: UncheckedAccount<'info>,

    #[account(
        init,
        payer = position_authority,
        space = LiquidityPosition::LEN,
        seeds = [
            b"liquidity_position".as_ref(),
            position_mint.key().as_ref(),
        ],
        bump,
    )]
    pub position: Box<Account<'info, LiquidityPosition>>,

    #[account(
        init,
        payer = position_authority,
        mint::authority = globalpool,
        mint::decimals = 0,
    )]
    pub position_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = position_authority,
        associated_token::mint = position_mint,
        associated_token::authority = position_authority,
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    pub globalpool: Box<Account<'info, Globalpool>>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OpenLiquidityPositionParams {
    tick_lower_index: i32,
    tick_upper_index: i32,
}

///
/// Opens a liquidity position in a GlobalPool.
///
pub fn open_liquidity_position(
    ctx: Context<OpenLiquidityPosition>,
    params: &OpenLiquidityPositionParams,
) -> Result<()> {
    let globalpool = &ctx.accounts.globalpool;
    let position_mint = &ctx.accounts.position_mint;
    let position = &mut ctx.accounts.position;

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
    )
}
