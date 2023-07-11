use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct InitializeClad<'info> {
    // TODO: multisig
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin, 
        space = Clad::LEN,
        seeds = [b"clad"],
        bump
    )]
    pub clad: Account<'info, Clad>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeCladParams {
    permissions: Permissions,
    protocol_fee_rate: u16,
}

pub fn initialize_clad(
    ctx: Context<InitializeClad>,
    params: &InitializeCladParams,
) -> Result<()> {
    let clad = &mut ctx.accounts.clad;

    let clad_bump = *ctx
        .bumps
        .get("clad")
        .ok_or(ProgramError::InvalidSeeds)?;

    Ok(clad.initialize(
        params.permissions,
        params.protocol_fee_rate,
        clad_bump,
    )?)
}
