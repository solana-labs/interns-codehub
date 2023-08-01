use anchor_lang::prelude::*;
use crate::state::ParallelTree;

#[derive(Accounts)]
#[instruction(max_size: u8, max_buffer_size: u8, canopy_depth: u8)]
pub struct CreateParallelTree<'info> {
    #[account(
        init,
        seeds = [b"spl-governance".as_ref(), merkle_tree.key().as_ref()],
        payer = payer,
        space = 10,
        bump
    )]
    pub parallel_tree: Account<'info, ParallelTree>,

    pub merkle_tree: AccountInfo<'info>,
}
