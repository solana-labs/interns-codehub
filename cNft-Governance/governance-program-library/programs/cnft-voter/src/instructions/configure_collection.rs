use crate::error::CompressedNftVoterError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use spl_governance::state::realm;

#[derive(Accounts)]
#[instruction(weight: u64, size: u32)]
pub struct ConfigureCollection<'info> {
    #[account(mut)]
    pub registrar: Account<'info, Registrar>,

    /// CHECK: Owned by spl-governance instance specified in registrar.governance_program_id
    #[account(
        address = registrar.realm @ CompressedNftVoterError::InvalidRealmForRegistrar,
        owner = registrar.governance_program_id
     )]
    pub realm: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = max_voter_weight_record.realm == registrar.realm
        @ CompressedNftVoterError::InvalidMaxVoterWeightRecordRealm,

        constraint = max_voter_weight_record.governing_token_mint == registrar.governing_token_mint
        @ CompressedNftVoterError::InvalidMaxVoterWeightRecordMint,
    )]
    pub max_voter_weight_record: Account<'info, MaxVoterWeightRecord>,

    pub realm_authority: Signer<'info>,
    pub collection: Account<'info, Mint>,
}

pub fn configure_collection(
    ctx: Context<ConfigureCollection>,
    weight: u64,
    size: u32,
) -> Result<()> {
    require!(size > 0, CompressedNftVoterError::InvalidCollectionSize);

    let registrar = &mut ctx.accounts.registrar;

    let realm = realm::get_realm_data_for_governing_token_mint(
        &registrar.governance_program_id,
        &ctx.accounts.realm,
        &registrar.governing_token_mint,
    )?;

    require!(
        realm.authority.unwrap() == ctx.accounts.realm_authority.key(),
        CompressedNftVoterError::InvalidRealmAuthority
    );

    let collection = &ctx.accounts.collection;

    let collection_config = CollectionConfig {
        collection: collection.key(),
        weight,
        size,
        reserved: [0; 8],
    };

    let collection_idx = registrar
        .collection_configs
        .iter()
        .position(|cc| cc.collection == collection.key());

    if let Some(collection_idx) = collection_idx {
        registrar.collection_configs[collection_idx] = collection_config;
    } else {
        // Note: In the current runtime version push() would throw an error if we exceed
        // max_collections specified when the Registrar was created
        registrar.collection_configs.push(collection_config);
    }

    // TODO: if weight == 0 then remove the collection from config
    // Currently if weight is set to 0 then the collection won't be removed but it won't have any governance power
    let max_voter_weight_record = &mut ctx.accounts.max_voter_weight_record;

    max_voter_weight_record.max_voter_weight = registrar
        .collection_configs
        .iter()
        .try_fold(0u64, |sum, cc| sum.checked_add(cc.get_max_weight()))
        .unwrap();

    max_voter_weight_record.max_voter_weight_expiry = None;

    Ok(())
}
