use anchor_lang::prelude::*;
use crate::utils::get_asset_id::get_asset_id;
use anchor_lang::solana_program::keccak;
use spl_account_compression::{ Node, Noop, program::SplAccountCompression };
use spl_account_compression::cpi::accounts::VerifyLeaf;
use crate::state::*;

#[derive(Accounts)]
pub struct MintGovernanceMetadata<'info> {
    #[account(mut, seeds = [b"spl-governance".as_ref(), merkle_tree.key().as_ref()], bump)]
    pub parallel_tree: UncheckedAccount<'info>,

    #[account(seeds = [merkle_tree.key().as_ref()], bump)]
    /// CHECK: This account is neither written to nor read from.
    pub tree_authority: Account<'info, TreeConfig>,
    /// CHECK: This account is checked in the instruction
    pub merkle_tree: AccountInfo<'info>,
    pub leaf_owner: AccountInfo<'info>,
    pub leaf_delegate: AccountInfo<'info>,

    pub log_wrapper: Program<'info, Noop>,
    pub compression_program: Program<'info, SplAccountCompression>,
    pub system_program: Program<'info, System>,
}

pub fn mint_governance_metadata<'info>(
    ctx: Context<'_, '_, '_, 'info, MintGovernanceMetadata<'info>>,
    root: [u8; 32],
    nonce: u64,
    index: u32,
    message: GovernanceMetadata
) -> Result<()> {
    let parallel_tree = &ctx.accounts.parallel_tree.to_account_info();
    let merkle_tree = &ctx.accounts.merkle_tree.to_account_info();
    let proofs = &ctx.remaining_accounts.to_vec();
    let leaf_owner = &ctx.accounts.leaf_owner.to_account_info();
    let leaf_delegate = &ctx.accounts.leaf_delegate.to_account_info();
    let compression_program = &ctx.accounts.compression_program.to_account_info();
    let tree_authority = &mut ctx.accounts.tree_authority.to_account_info();

    // to verify that the leaf should be empty
    let leaf = Node::default();
    let cpi_ctx = CpiContext::new(compression_program.clone(), VerifyLeaf {
        merkle_tree: parallel_tree.clone(),
    }).with_remaining_accounts(proofs.clone());

    spl_account_compression::cpi::verify_leaf(cpi_ctx, root.clone(), leaf, index)?;

    let asset_id = get_asset_id(&parallel_tree.key(), &message.nft_mint);
    let data_hash = keccak::hashv(&[message.try_to_vec()?.as_slice()]).to_bytes();

    let new_leaf = LeafSchema::new_v0(
        asset_id,
        *leaf_owner.key,
        *leaf_delegate.key,
        nonce,
        data_hash
    );

    let seed = merkle_tree.key();
    let authority_seeds = &[seed.as_ref(), &[*ctx.bumps.get("tree_authority").unwrap()]];
    let authority_pda_signer = &[&authority_seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        compression_program.clone(),
        spl_account_compression::cpi::accounts::Modify {
            authority: tree_authority.clone(),
            merkle_tree: parallel_tree.clone(),
            noop: ctx.accounts.log_wrapper.to_account_info(),
        },
        authority_pda_signer
    ).with_remaining_accounts(proofs.clone());
    spl_account_compression::cpi::insert_or_append(cpi_ctx, root, new_leaf.to_node(), index)?;
    Ok(())
}
