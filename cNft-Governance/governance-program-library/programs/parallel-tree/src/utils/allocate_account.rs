use solana_program::account_info::AccountInfo;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use solana_program::msg;
use solana_program::{ rent::Rent, sysvar::Sysvar };
use solana_program::system_instruction::create_account;
use solana_program::program::invoke_signed;
use crate::state::ParallelTree;

pub fn allocate_account<'a>(
    payer: &AccountInfo<'a>,
    account: &mut AccountInfo<'a>,
    account_address_seeds: &[&[u8]],
    max_depth: u32,
    max_buffer_size: u32,
    canopy_depth: u32,
    program_id: &Pubkey,
    owner_program_id: &Pubkey,
    system_program: &AccountInfo<'a>
) -> Result<(), ProgramError> {
    let (account_address, bump_seed) = Pubkey::find_program_address(
        account_address_seeds,
        program_id
    );

    if account_address != *account.key {
        msg!(
            "Create account with PDA: {:?} was requested while PDA: {:?} was expected",
            account.key,
            account_address
        );
        return Err(ProgramError::InvalidSeeds);
    }

    let rent = Rent::get()?;
    let account_size = ParallelTree::get_space(max_depth, max_buffer_size, canopy_depth);
    let lamports = rent.minimum_balance(account_size);

    let mut signers_seeds = account_address_seeds.to_vec();
    let bump = &[bump_seed];
    signers_seeds.push(bump);

    let create_account_instruction = create_account(
        payer.key,
        account.key,
        lamports,
        account_size as u64,
        owner_program_id
    );

    invoke_signed(
        &create_account_instruction,
        &[payer.clone(), account.clone(), system_program.clone()],
        &[&signers_seeds]
    )?;

    Ok(())
}
