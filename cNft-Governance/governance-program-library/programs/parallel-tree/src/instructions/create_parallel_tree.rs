use anchor_lang::prelude::*;
use mpl_bubblegum::state::TreeConfig as BubblegumTreeConfig;
use spl_account_compression::{ self, Noop, program::SplAccountCompression };
use crate::state::*;
use crate::error::ParallelTreeError;
use crate::utils::allocate_account::*;
use crate::id;

#[derive(Accounts)]
#[instruction(max_depth: u32, max_buffer_size: u32, canopy_depth: u32)]
pub struct CreateParallelTree<'info> {
    #[account(
        init,
        seeds = [parallel_tree.key().as_ref()],
        payer = payer,
        space = TREE_AUTHORITY_SIZE,
        bump
    )]
    pub parallel_tree_authority: Account<'info, TreeConfig>,

    // #[account(
    //     init,
    //     seeds = [b"spl-governance", main_tree.key().as_ref()],
    //     bump,
    //     space = ParallelTree::get_space(max_depth, max_buffer_size, canopy_depth),
    //     payer = payer
    // )]
    #[account(mut)]
    /// CHECK: This account should be empty
    pub parallel_tree: UncheckedAccount<'info>,

    pub main_tree_authority: Account<'info, BubblegumTreeConfig>,
    /// CHECK: This account is checked in the instruction
    pub main_tree: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub tree_creator: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub log_wrapper: Program<'info, Noop>,
    pub compression_program: Program<'info, SplAccountCompression>,
}

pub fn create_parallel_tree<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CreateParallelTree<'info>>,
    max_depth: u32,
    max_buffer_size: u32,
    canopy_depth: u32,
    public: Option<bool>
) -> Result<()> {
    let parallel_tree = &mut ctx.accounts.parallel_tree.to_account_info();
    let parallel_tree_authority = &mut ctx.accounts.parallel_tree_authority;

    let main_tree = &ctx.accounts.main_tree.to_account_info();
    let main_tree_authority = &ctx.accounts.main_tree_authority;
    let tree_creator = &mut ctx.accounts.tree_creator.to_account_info();
    let public = public.unwrap_or(false);
    require!(parallel_tree.data_is_empty(), ParallelTreeError::ConcurrentMerkleTreeDataNotEmpty);
    require!(
        tree_creator.key() == main_tree_authority.tree_creator ||
            tree_creator.key() == main_tree_authority.tree_delegate,
        ParallelTreeError::InvalidParallelTreeCreator
    );
    require!(
        public == main_tree_authority.is_public,
        ParallelTreeError::InvalidParallelTreePublicFlag
    );

    let parallel_tree_address_seeds = get_parallel_tree_seeds(&main_tree.key);
    allocate_account(
        &ctx.accounts.payer,
        parallel_tree,
        &parallel_tree_address_seeds,
        max_depth,
        max_buffer_size,
        canopy_depth,
        &id(),
        &spl_account_compression::id(),
        &ctx.accounts.system_program
    )?;

    let seed = parallel_tree.key();
    let seeds = &[seed.as_ref(), &[*ctx.bumps.get("parallel_tree_authority").unwrap()]];
    let authority_pda_signer = &[&seeds[..]];
    parallel_tree_authority.set_inner(TreeConfig {
        tree_creator: ctx.accounts.tree_creator.key(),
        tree_delegate: ctx.accounts.tree_creator.key(),
        total_mint_capacity: 1 << max_depth,
        num_minted: 0,
        is_public: public,
    });
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.compression_program.to_account_info(),
        spl_account_compression::cpi::accounts::Initialize {
            authority: ctx.accounts.parallel_tree_authority.to_account_info(),
            merkle_tree: parallel_tree.to_account_info(),
            noop: ctx.accounts.log_wrapper.to_account_info(),
        },
        authority_pda_signer
    );
    spl_account_compression::cpi::init_empty_merkle_tree(cpi_ctx, max_depth, max_buffer_size)?;

    Ok(())
}
