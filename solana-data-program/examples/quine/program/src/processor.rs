use crate::{
    error::QuineError,
    instruction::{DataAccountInstruction, QuineInstruction},
    state::{DataTypeOption, UpdateDataAccountArgs, COLORS, METADATA_SIZE},
};
use borsh::BorshDeserialize;
use solana_program::instruction::{AccountMeta, Instruction};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar::Sysvar,
};

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = QuineInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        match instruction {
            QuineInstruction::UpdateQuineMetadata(args) => {
                msg!("UpdateQuineMetadata");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                if !authority.is_signer {
                    return Err(QuineError::NotSigner.into());
                }

                if !authority.is_writable
                    || !data_account.is_writable
                    || !metadata_account.is_writable
                {
                    return Err(QuineError::NotWriteable.into());
                }

                if metadata_account.data_len() < METADATA_SIZE {
                    return Err(QuineError::NoAccountLength.into());
                }

                // update "no" to "si"
                let update_args = UpdateDataAccountArgs {
                    data_type: DataTypeOption::JSON,
                    data: "si".as_bytes().to_vec(),
                    offset: args.metadata_update_offset,
                    realloc_down: false,
                    verify_flag: false,
                    debug: true,
                };
                let encoded_ix = DataAccountInstruction::UpdateDataAccount(update_args);
                let account_metas = vec![
                    AccountMeta::new(*authority.key, true),
                    AccountMeta::new(*data_account.key, false),
                    AccountMeta::new(*metadata_account.key, false),
                    AccountMeta::new_readonly(*system_program.key, false),
                ];
                let instruction =
                    Instruction::new_with_borsh(*data_program.key, &encoded_ix, account_metas);
                invoke(
                    &instruction,
                    &[
                        authority.clone(),
                        data_account.clone(),
                        metadata_account.clone(),
                        system_program.clone(),
                    ],
                )?;
                Ok(())
            }
            QuineInstruction::AppendQuineMetadata(args) => {
                msg!("AppendQuineMetadata");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                if !authority.is_signer {
                    return Err(QuineError::NotSigner.into());
                }

                if !authority.is_writable
                    || !data_account.is_writable
                    || !metadata_account.is_writable
                {
                    return Err(QuineError::NotWriteable.into());
                }

                if metadata_account.data_len() < METADATA_SIZE {
                    return Err(QuineError::NoAccountLength.into());
                }

                // append new attribute
                let offset = data_account.data_len() - args.metadata_end_offset as usize;
                let mut data = ",{\"trait_type\":\"Newly added trait\",\"value\":\"heck yeah!\"}"
                    .as_bytes()
                    .to_vec();
                data.extend_from_slice(&data_account.data.borrow()[offset..]);

                let update_args = UpdateDataAccountArgs {
                    data_type: DataTypeOption::JSON,
                    data,
                    offset: offset as u64,
                    realloc_down: false,
                    verify_flag: false,
                    debug: true,
                };
                let encoded_ix = DataAccountInstruction::UpdateDataAccount(update_args);
                let account_metas = vec![
                    AccountMeta::new(*authority.key, true),
                    AccountMeta::new(*data_account.key, false),
                    AccountMeta::new(*metadata_account.key, false),
                    AccountMeta::new_readonly(*system_program.key, false),
                ];
                let instruction =
                    Instruction::new_with_borsh(*data_program.key, &encoded_ix, account_metas);
                invoke(
                    &instruction,
                    &[
                        authority.clone(),
                        data_account.clone(),
                        metadata_account.clone(),
                        system_program.clone(),
                    ],
                )?;
                Ok(())
            }
            QuineInstruction::UpdateQuineColor(args) => {
                msg!("UpdateQuineColor");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                if !authority.is_signer {
                    return Err(QuineError::NotSigner.into());
                }

                if !authority.is_writable
                    || !data_account.is_writable
                    || !metadata_account.is_writable
                {
                    return Err(QuineError::NotWriteable.into());
                }

                if metadata_account.data_len() < METADATA_SIZE {
                    return Err(QuineError::NoAccountLength.into());
                }

                // get new color based on current timestamp
                let clock = Clock::get()?;
                let current_timestamp = clock.unix_timestamp;
                let secs = (current_timestamp % 86_400) as f32;
                let idx = (secs / (COLORS.len() as f32)).floor() as usize;

                // update color
                let update_args = UpdateDataAccountArgs {
                    data_type: DataTypeOption::HTML,
                    data: COLORS[idx].as_bytes().to_vec(),
                    offset: args.color_update_offset,
                    realloc_down: false,
                    verify_flag: false,
                    debug: true,
                };
                let encoded_ix = DataAccountInstruction::UpdateDataAccount(update_args);
                let account_metas = vec![
                    AccountMeta::new(*authority.key, true),
                    AccountMeta::new(*data_account.key, false),
                    AccountMeta::new(*metadata_account.key, false),
                    AccountMeta::new_readonly(*system_program.key, false),
                ];
                let instruction =
                    Instruction::new_with_borsh(*data_program.key, &encoded_ix, account_metas);
                invoke(
                    &instruction,
                    &[
                        authority.clone(),
                        data_account.clone(),
                        metadata_account.clone(),
                        system_program.clone(),
                    ],
                )?;

                Ok(())
            }
        }
    }
}
