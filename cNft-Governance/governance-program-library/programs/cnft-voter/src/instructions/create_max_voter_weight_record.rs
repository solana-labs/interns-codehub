use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use spl_governance::state::realm;

use crate::state::max_voter_weight_record::MaxVoterWeightRecord;

#[derive(Accounts)]
pub struct CreateMaxVoterWeightRecord<'info> {
    #[account(
        init,
        seeds = [
            b"max-voter-weight-record".as_ref(),
            realm.key().as_ref(),
            realm_governing_token_mint.key().as_ref()
        ],
        bump,
        payer = payer,
        space = MaxVoterWeightRecord::get_space(),
    )]
    pub max_voter_weight_record: Account<'info, MaxVoterWeightRecord>,

    /// The program id of the spl-governance program the realm belongs to
    /// CHECK: Can be any instance of spl-governance and it's not known at the compilation time
    #[account(executable)]
    pub governance_program_id: UncheckedAccount<'info>,

    /// CHECK: Owned by spl-governance instance specified in governance_program_id
    #[account(owner = governance_program_id.key())]
    pub realm: UncheckedAccount<'info>,

    pub realm_governing_token_mint: Account<'info, Mint>, // should I name it governing_token_mint?

    #[account(mut)]
    payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_max_voter_weight_record(ctx: Context<CreateMaxVoterWeightRecord>) -> Result<()> {
    let max_voter_weight_record = &mut ctx.accounts.max_voter_weight_record;

    let _realm = realm::get_realm_data_for_governing_token_mint(
        &ctx.accounts.governance_program_id.key(),
        &ctx.accounts.realm,
        &ctx.accounts.realm_governing_token_mint.key(),
    );

    max_voter_weight_record.realm = ctx.accounts.realm.key();
    max_voter_weight_record.governing_token_mint = ctx.accounts.realm_governing_token_mint.key();

    max_voter_weight_record.max_voter_weight_expiry = Some(0);

    Ok(())
}