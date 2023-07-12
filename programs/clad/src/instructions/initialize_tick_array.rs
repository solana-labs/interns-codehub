use {crate::state::*, anchor_lang::prelude::*};

#[derive(Accounts)]
#[instruction(start_tick_index: i32)]
pub struct InitializeTickArray<'info> {
    pub globalpool: Account<'info, Globalpool>,

    #[account(mut)]
    pub funder: Signer<'info>,

    #[account(
        init,
        payer = funder,
        seeds = [b"tick_array", globalpool.key().as_ref(), start_tick_index.to_string().as_bytes()],
        bump,
        space = TickArray::LEN
    )]
    pub tick_array: AccountLoader<'info, TickArray>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeTickArrayParams {
    start_tick_index: i32
}

pub fn initialize_tick_array(ctx: Context<InitializeTickArray>, params: &InitializeTickArrayParams) -> Result<()> {
    let mut tick_array = ctx.accounts.tick_array.load_init()?;
    Ok(tick_array.initialize(&ctx.accounts.globalpool, params.start_tick_index)?)
}
