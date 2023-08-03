use anchor_lang::prelude::*;
pub mod error;
use instructions::*;
mod instructions;
pub mod utils;
use state::*;
pub mod state;

declare_id!("pmtcFF8oVLWBK2EKuGSLJtRbePDNNYyvqhEJ6cKBhMH");

#[program]
pub mod parallel_tree {
    use super::*;

    pub fn create_parallel_tree<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreateParallelTree<'info>>,
        max_depth: u32,
        max_buffer_size: u32,
        canopy_depth: u32,
        public: Option<bool>
    ) -> Result<()> {
        log_version();
        instructions::create_parallel_tree(ctx, max_depth, max_buffer_size, canopy_depth, public)
    }

    pub fn mint_governance_metadata<'info>(
        ctx: Context<'_, '_, '_, 'info, MintGovernanceMetadata<'info>>,
        root: [u8; 32],
        nonce: u64,
        index: u32,
        message: GovernanceMetadata
    ) -> Result<()> {
        log_version();
        instructions::mint_governance_metadata(ctx, root, nonce, index, message)
    }

    pub fn modify_governance_metadata<'info>(
        ctx: Context<'_, '_, '_, 'info, ModifyGovernanceMetadata<'info>>,
        root: [u8; 32],
        nonce: u64,
        index: u32, // still don't understand why need both index and nonce
        data_hash: [u8; 32],
        message: GovernanceMetadata
    ) -> Result<()> {
        log_version();
        instructions::modify_governance_metadata(ctx, root, nonce, index, data_hash, message)
    }

    pub fn remove_governance_metadata<'info>(
        ctx: Context<'_, '_, '_, 'info, RemoveGovernanceMetadata<'info>>,
        root: [u8; 32],
        nonce: u64,
        index: u32, // still don't understand why need both index and nonce
        data_hash: [u8; 32],
        nft_mint: Pubkey
    ) -> Result<()> {
        log_version();
        instructions::remove_governance_metadata(ctx, root, nonce, index, data_hash, nft_mint)
    }
}

fn log_version() {
    // TODO: Check if Anchor allows to log it before instruction is deserialized
    msg!("VERSION:{:?}", env!("CARGO_PKG_VERSION"));
}
