use anchor_lang::prelude::*;

pub mod error;

mod instructions;
use instructions::*;

pub mod state;

pub mod utils;


use crate::state::*;

declare_id!("GnftV5kLjd67tvHpNGyodwWveEKivz3ZWvvE3Z4xi2iw");

#[program]
pub mod cnft_voter {
    use super::*; //use to bring the CPI struct into the scope of the program
    pub fn create_registrar(ctx: Context<CreateRegistrar>, max_collections: u8) -> Result<()> {
        log_version();
        instructions::create_registrar(ctx, max_collections)
    }

    pub fn create_voter_weight_record(ctx: Context<CreateVoterWeightRecord>, governing_token_owner: Pubkey) -> Result<()> {
        log_version();
        instructions::create_voter_weight_record(ctx, governing_token_owner)
    }

    pub fn create_max_boter_weight_record(ctx: Context<CreateMaxVoterWeightRecord>) -> Result<()> {
        log_version();
        instructions::create_max_voter_weight_record(ctx)
    }

    pub fn update_voter_weight_record(ctx: Context<UpdateVoterWeightRecord>, voter_weight_action: VoterWeightAction) -> Result<()> {
        log_version();
        instructions::update_voter_weight_record(ctx, voter_weight_action)
    }

    pub fn relinquish_nft_vote(ctx: Context<RelinquishNftVote>) -> Result<()> {
        log_version();
        instructions::relinquish_nft_vote(ctx)
    }
}

fn log_version() {
    // TODO: Check if Anchor allows to log it before instruction is deserialized
    msg!("VERSION:{:?}", env!("CARGO_PKG_VERSION"));
}