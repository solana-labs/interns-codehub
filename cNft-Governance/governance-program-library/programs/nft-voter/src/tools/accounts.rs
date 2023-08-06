use solana_program::account_info::AccountInfo;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use solana_program::{ rent::Rent, sysvar::Sysvar };
use solana_program::system_instruction::create_account;
use solana_program::system_program;
use solana_program::program::invoke_signed;
use solana_program::msg;
use crate::state::*;

pub fn create_nft_vote_ticket_account<'a>(
    payer: &AccountInfo<'a>,
    account_info: &AccountInfo<'a>,
    registrar: &Pubkey,
    nft_mint: &Pubkey,
    ticket_type: &str,
    system_program: &AccountInfo<'a>
) -> Result<(), ProgramError> {
    let account_address_seeds = get_nft_vote_ticket_seeds(ticket_type, registrar, nft_mint);
    let (account_address, bump_seed) = get_nft_vote_ticket_address(
        ticket_type,
        registrar,
        nft_mint
    );

    if account_address != *account_info.key {
        msg!(
            "Create account with PDA: {:?} was requested while PDA: {:?} was expected",
            account_info.key,
            account_address
        );
        return Err(ProgramError::InvalidSeeds);
    }

    let rent = Rent::get()?;

    let lamports = rent.minimum_balance(NFT_VOTE_TICKET_SIZE);
    let mut signers_seeds = account_address_seeds.to_vec();
    let bump = &[bump_seed];
    signers_seeds.push(bump);

    let create_account_instruction = create_account(
        payer.key,
        &account_address,
        lamports,
        NFT_VOTE_TICKET_SIZE as u64,
        &crate::id()
    );

    invoke_signed(
        &create_account_instruction,
        &[payer.clone(), account_info.clone(), system_program.clone()],
        &[&signers_seeds]
    )?;
    Ok(())
}

pub fn serialize_nft_vote_ticket_account(
    serialized_data: &Vec<u8>,
    account_info: &AccountInfo
) -> Result<(), ProgramError> {
    account_info.data.borrow_mut().copy_from_slice(&serialized_data);
    Ok(())
}

pub fn close_nft_vote_ticket_account(
    account_info: &AccountInfo,
    beneficiary_info: &AccountInfo
) -> Result<(), ProgramError> {
    let account_lamports = account_info.lamports();
    **account_info.lamports.borrow_mut() = 0;

    **beneficiary_info.lamports.borrow_mut() = beneficiary_info
        .lamports()
        .checked_add(account_lamports)
        .unwrap();

    account_info.assign(&system_program::id());
    account_info.realloc(0, false)
}
