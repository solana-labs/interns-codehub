use {crate::state::clad::*, anchor_lang::prelude::*};

#[derive(Accounts)]
pub struct AddCustody<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"clad"],
        bump = clad.clad_bump,
    )]
    pub clad: Box<Account<'info, Clad>>,

    #[account(
        mut,
        seeds = [b"transfer_authority"],
        bump = clad.transfer_authority_bump
    )]
    pub transfer_authority: AccountInfo<'info>,

    #[account(
        mut,
        realloc = Globalpool::LEN 
                + (pool.custodies.len() + 1) * std::mem::size_of::<Pubkey>() 
                + (pool.ratios.len() + 1) * std::mem::size_of::<TokenRatios>(),
        realloc::payer = admin,
        realloc::zero = false,
        seeds = [
            b"globalpool",
            self.token_mint_a.as_ref(),
            self.token_mint_b.as_ref(),
            self.tick_spacing_seed.as_ref(),
            self.bump.as_ref()
        ],
        bump = pool.bump
    )]
    pub pool: Box<Account<'info, Globalpool>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddCustodyParams {
    // pub
}

pub fn add_custody<'info>(ctx: Context<AddCustody>, params: &AddCustodyParams) -> Result<u8> {}
