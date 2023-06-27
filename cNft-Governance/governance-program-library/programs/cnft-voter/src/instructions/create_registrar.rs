use crate::error::CompressedNftVoterError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use spl_governance::state::realm;

/// Creates Registrar storing NFT governance configuration for spl-gov Realm
/// This instruction should only be executed once per realm/governing_token_mint to create the account
#[derive(Accounts)]
#[instruction(max_collections: u8)]
pub struct CreateRegistrar<'info> {
    /// The cNFT voring Registrar, only one single registrar per fovernance Realm.
    #[account(
        init, // if this function should be only called once as initialization, use init; otherwise, use init_if_needed
        seeds = [b"registrar".as_ref(), realm.key().as_ref(), governing_token_mint.key().as_ref()],
        bump, // if set bump = bump, this mean you give a bump value to system, but when init, the system will bump for you, so bump means tell the system to bump for you.
        payer = payer, // who pays for the creation of the account
        space = Registrar::get_space(max_collections)
    )]
    pub registrar: Account<'info, Registrar>,


    #[account(executable)]
    pub governance_program_id: UncheckedAccount<'info>,

    /// An spl-governance Realm
    ///
    /// Realm is validated in the instruction:
    /// - Realm is owned by the governance_program_id
    /// - governing_token_mint must be the community or council mint
    /// - realm_authority is realm.authority
    /// CHECK: Owned by spl-governance instance specified in governance_program_id
    #[account(owner = governance_program_id.key())]
    pub realm: UncheckedAccount<'info>,

    pub governing_token_mint: Account<'info, Mint>,

    /// realm_authority must sign and match Realm.authority
    pub realm_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_registrar(ctx: Context<CreateRegistrar>, _max_collections: u8) -> Result<()> {
    let registrar = &mut ctx.accounts.registrar;
    registrar.governance_program_id = ctx.accounts.governance_program_id.key();
    registrar.realm = ctx.accounts.realm.key();
    registrar.governing_token_mint = ctx.accounts.governing_token_mint.key();

    // Verify that realm_authority is the expected authority of the Realm
    // and that the mint matches one of the realm mints too
    let realm = realm::get_realm_data_for_governing_token_mint(
        &registrar.governance_program_id,
        &ctx.accounts.realm,
        &registrar.governing_token_mint,
    )?;

    require!(
        realm.authority.unwrap() == ctx.accounts.realm_authority.key(),
        CompressedNftVoterError::InvalidRealmAuthority
    );

    Ok(())
}


