use {
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::{AccountInfo, Pubkey, Signer, *},
        ToAccountInfo,
    },
    anchor_spl::token::TokenAccount,
    solana_program::program_option::COption,
    std::convert::TryFrom,
};

/// Verify position authority for either Liquidity or Trade Position.
///
/// # Arguments
///
/// * `position_token_account`
/// * `position_authority`
pub fn verify_position_authority<'info>(
    position_token_account: &TokenAccount,
    position_authority: &Signer<'info>,
) -> Result<()> {
    // Check token authority using validate_owner method...
    match position_token_account.delegate {
        COption::Some(ref delegate) if position_authority.key == delegate => {
            validate_owner(delegate, &position_authority.to_account_info())?;
            if position_token_account.delegated_amount != 1 {
                return Err(ErrorCode::InvalidPositionTokenAmount.into());
            }
        }
        _ => validate_owner(
            &position_token_account.owner,
            &position_authority.to_account_info(),
        )?,
    };
    Ok(())
}

fn validate_owner(expected_owner: &Pubkey, owner_account_info: &AccountInfo) -> Result<()> {
    if expected_owner != owner_account_info.key || !owner_account_info.is_signer {
        return Err(ErrorCode::MissingOrInvalidDelegate.into());
    }

    Ok(())
}

pub fn to_timestamp_u64(t: i64) -> Result<u64> {
    u64::try_from(t).or(Err(ErrorCode::InvalidTimestampConversion.into()))
}

pub fn sort_token_vault_for_loan<'info>(
    token_vault_a: &'info TokenAccount,
    token_vault_b: &'info TokenAccount,
    is_borrow_a: bool,
) -> (&'info TokenAccount, &'info TokenAccount) {
    if is_borrow_a {
        (token_vault_a, token_vault_b)
    } else {
        (token_vault_b, token_vault_a)
    }
}

pub fn sort_token_amount_for_loan<'info>(
    token_vault_a: &'info TokenAccount,
    token_vault_b: &'info TokenAccount,
    is_borrow_a: bool,
) -> (u64, u64) {
    let (borrowed_token_vault, collateral_token_vault) = sort_token_vault_for_loan(
        token_vault_a,
        token_vault_b,
        is_borrow_a,
    );
    (borrowed_token_vault.amount, collateral_token_vault.amount)
}
