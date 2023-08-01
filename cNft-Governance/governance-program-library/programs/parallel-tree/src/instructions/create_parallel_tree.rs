use anchor_lang::prelude::*;
use mpl_bubblegum::state::TreeConfig;
use spl_account_compression::{ Noop, program::SplAccountCompression };
use crate::state::*;
use crate::error::ParallelTreeError;
use crate::utils::allocate_account::*;

#[derive(Accounts)]
#[instruction(max_size: u32, max_buffer_size: u32, canopy_depth: u32)]
pub struct CreateParallelTree<'info> {
    #[account(seeds = [merkle_tree.key().as_ref()], bump)]
    pub tree_authority: Account<'info, TreeConfig>,
    /// CHECK: This account is checked in the instruction
    pub merkle_tree: UncheckedAccount<'info>,
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub log_wrapper: Program<'info, Noop>,
    pub compression_program: Program<'info, SplAccountCompression>,
}

pub fn create_parallel_tree<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CreateParallelTree<'info>>,
    max_depth: u32,
    max_buffer_size: u32,
    canopy_depth: u32
) -> Result<()> {
    // let parallel_tree = &mut ctx.accounts.parallel_tree.to_account_info();
    let parallel_tree = &mut ctx.remaining_accounts[0].to_account_info();
    let merkle_tree = &mut ctx.accounts.merkle_tree.to_account_info();
    let tree_authority = &mut ctx.accounts.tree_authority.to_account_info();
    require!(parallel_tree.data_is_empty(), ParallelTreeError::ConcurrentMerkleTreeDataNotEmpty);

    let parallel_tree_address_seeds = get_parallel_tree_seeds(&merkle_tree.key);
    allocate_account(
        &ctx.accounts.payer,
        parallel_tree,
        &parallel_tree_address_seeds,
        max_depth,
        max_buffer_size,
        canopy_depth,
        &ctx.accounts.log_wrapper.key,
        &ctx.accounts.system_program
    )?;

    let seed = merkle_tree.key();
    let authority_seeds = &[seed.as_ref(), &[*ctx.bumps.get("tree_authority").unwrap()]];
    let authority_pda_signer = &[&authority_seeds[..]];
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.compression_program.to_account_info(),
        spl_account_compression::cpi::accounts::Initialize {
            authority: tree_authority.clone(),
            merkle_tree: parallel_tree.clone(),
            noop: ctx.accounts.log_wrapper.to_account_info(),
        },
        authority_pda_signer
    );
    spl_account_compression::cpi::init_empty_merkle_tree(cpi_ctx, max_depth, max_buffer_size)?;

    Ok(())
}
