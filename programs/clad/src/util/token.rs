use crate::state::Globalpool;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use solana_program::program::invoke_signed;
use spl_token::instruction::{burn_checked, close_account, mint_to, set_authority, AuthorityType};

pub fn transfer_from_owner_to_vault<'info>(
    position_authority: &Signer<'info>,
    token_owner_account: &Account<'info, TokenAccount>,
    token_vault: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    token::transfer(
        CpiContext::new(
            token_program.to_account_info(),
            Transfer {
                from: token_owner_account.to_account_info(),
                to: token_vault.to_account_info(),
                authority: position_authority.to_account_info(),
            },
        ),
        amount,
    )
}

pub fn transfer_from_vault_to_owner<'info>(
    globalpool: &Account<'info, Globalpool>,
    token_vault: &Account<'info, TokenAccount>,
    token_owner_account: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: token_vault.to_account_info(),
                to: token_owner_account.to_account_info(),
                authority: globalpool.to_account_info(),
            },
            &[&globalpool.seeds()],
        ),
        amount,
    )
}

pub fn burn_and_close_user_position_token<'info>(
    token_authority: &Signer<'info>,
    receiver: &UncheckedAccount<'info>,
    position_mint: &Account<'info, Mint>,
    position_token_account: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    // Burn a single token in user account
    invoke_signed(
        &burn_checked(
            token_program.key,
            position_token_account.to_account_info().key,
            position_mint.to_account_info().key,
            token_authority.key,
            &[],
            1,
            position_mint.decimals,
        )?,
        &[
            token_program.to_account_info(),
            position_token_account.to_account_info(),
            position_mint.to_account_info(),
            token_authority.to_account_info(),
        ],
        &[],
    )?;

    // Close user account
    invoke_signed(
        &close_account(
            token_program.key,
            position_token_account.to_account_info().key,
            receiver.key,
            token_authority.key,
            &[],
        )?,
        &[
            token_program.to_account_info(),
            position_token_account.to_account_info(),
            receiver.to_account_info(),
            token_authority.to_account_info(),
        ],
        &[],
    )?;
    Ok(())
}

pub fn mint_position_token_and_remove_authority<'info>(
    globalpool: &Account<'info, Globalpool>,
    position_mint: &Account<'info, Mint>,
    position_token_account: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    mint_position_token(
        globalpool,
        position_mint,
        position_token_account,
        token_program,
    )?;
    remove_position_token_mint_authority(globalpool, position_mint, token_program)
}

fn mint_position_token<'info>(
    globalpool: &Account<'info, Globalpool>,
    position_mint: &Account<'info, Mint>,
    position_token_account: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    invoke_signed(
        &mint_to(
            token_program.key,
            position_mint.to_account_info().key,
            position_token_account.to_account_info().key,
            globalpool.to_account_info().key,
            &[globalpool.to_account_info().key],
            1,
        )?,
        &[
            position_mint.to_account_info(),
            position_token_account.to_account_info(),
            globalpool.to_account_info(),
            token_program.to_account_info(),
        ],
        &[&globalpool.seeds()],
    )?;
    Ok(())
}

fn remove_position_token_mint_authority<'info>(
    globalpool: &Account<'info, Globalpool>,
    position_mint: &Account<'info, Mint>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    invoke_signed(
        &set_authority(
            token_program.key,
            position_mint.to_account_info().key,
            Option::None,
            AuthorityType::MintTokens,
            globalpool.to_account_info().key,
            &[globalpool.to_account_info().key],
        )?,
        &[
            position_mint.to_account_info(),
            globalpool.to_account_info(),
            token_program.to_account_info(),
        ],
        &[&globalpool.seeds()],
    )?;
    Ok(())
}
