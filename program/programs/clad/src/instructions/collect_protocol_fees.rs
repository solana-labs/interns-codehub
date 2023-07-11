use crate::{state::*, util::transfer_from_vault_to_owner};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

#[derive(Accounts)]
pub struct CollectProtocolFees<'info> {
    pub globalpools_config: Box<Account<'info, GlobalpoolsConfig>>,

    #[account(mut, has_one = globalpools_config)]
    pub globalpool: Box<Account<'info, Globalpool>>,

    #[account(address = globalpools_config.collect_protocol_fees_authority)]
    pub collect_protocol_fees_authority: Signer<'info>,

    #[account(mut, address = globalpool.token_vault_a)]
    pub token_vault_a: Account<'info, TokenAccount>,

    #[account(mut, address = globalpool.token_vault_b)]
    pub token_vault_b: Account<'info, TokenAccount>,

    #[account(mut, constraint = token_destination_a.mint == globalpool.token_mint_a)]
    pub token_destination_a: Account<'info, TokenAccount>,

    #[account(mut, constraint = token_destination_b.mint == globalpool.token_mint_b)]
    pub token_destination_b: Account<'info, TokenAccount>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
}

pub fn collect_protocol_fees(ctx: Context<CollectProtocolFees>) -> Result<()> {
    let globalpool = &ctx.accounts.globalpool;

    transfer_from_vault_to_owner(
        globalpool,
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_destination_a,
        &ctx.accounts.token_program,
        globalpool.protocol_fee_owed_a,
    )?;

    transfer_from_vault_to_owner(
        globalpool,
        &ctx.accounts.token_vault_b,
        &ctx.accounts.token_destination_b,
        &ctx.accounts.token_program,
        globalpool.protocol_fee_owed_b,
    )?;

    Ok(ctx.accounts.globalpool.reset_protocol_fees_owed())
}
