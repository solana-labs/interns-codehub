use crate::{
    instruction::{DataAccountInstruction, IdentityInstruction},
    state::{DataTypeOption, UpdateDataAccountArgs, SVGEND, SVGSTART},
};
use borsh::BorshDeserialize;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    hash::hash,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    log::sol_log_compute_units,
};

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = IdentityInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        match instruction {
            IdentityInstruction::InitializeIdentity(args) => {
                msg!("InitializeIdentity");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                let env_account = next_account_info(accounts_iter)?;
                let head_account = next_account_info(accounts_iter)?;

                let seed = hash(&args.identity.to_bytes()).to_bytes();

                let hex_seed = u128::from_le_bytes(seed[..16].try_into().unwrap());
                let hex_num: u64 = ((hex_seed as f64).sin() * 16777215.).abs().floor() as u64;
                let hex_str = format!("#{:x}", hex_num);
                let env = &env_account.try_borrow_data()?[..];
                let env_str = str::replace(std::str::from_utf8(env).unwrap(), "#01", &hex_str);

                let hex_seed = u128::from_le_bytes(seed[16..].try_into().unwrap());
                let hex_num: u64 = ((hex_seed as f64).sin() * 16777215.).abs().floor() as u64;
                let hex_str = format!("#{:x}", hex_num);
                let head = &head_account.try_borrow_data()?[..];
                let head_str = str::replace(std::str::from_utf8(head).unwrap(), "#000", &hex_str);

                let mut data = SVGSTART.to_vec();
                data.extend_from_slice(env_str.as_bytes());
                data.extend_from_slice(head_str.as_bytes());

                // update with new value
                let update_args = UpdateDataAccountArgs {
                    data,
                    offset: 0,
                    data_type: DataTypeOption::HTML,
                    realloc_down: true,
                    verify_flag: false,
                    debug: false,
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
            IdentityInstruction::AppendIdentityClo(args) => {
                msg!("AppendIdentityClo");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                let seed = hash(&args.identity.to_bytes()).to_bytes();
                let clo_seed = u64::from_le_bytes(seed[..8].try_into().unwrap());
                let clo_idx = clo_seed % (accounts.len() - 5) as u64;
                let clo_account = &accounts[5 + clo_idx as usize];

                let hex_num: u64 = ((clo_seed as f64).sin() * 16777215.).abs().floor() as u64;
                let hex_str = format!("{:x}", hex_num);
                let clo = &clo_account.try_borrow_data()?[..];
                let mut clo_str = std::str::from_utf8(clo).unwrap().to_string();

                let idxs: Vec<_> = clo_str.match_indices("#").map(|(i, _)| i).collect();
                idxs.iter().for_each(|idx| {
                    if clo_str.chars().nth(*idx + 4).unwrap() == '"' {
                        clo_str.replace_range(*idx + 1..*idx + 4, &hex_str[..3]);
                    } else {
                        clo_str.replace_range(*idx + 1..*idx + 7, &hex_str);
                    }
                });

                // update with new value
                let update_args = UpdateDataAccountArgs {
                    data: clo_str.as_bytes().to_vec(),
                    offset: data_account.data_len() as u64,
                    data_type: DataTypeOption::HTML,
                    realloc_down: true,
                    verify_flag: false,
                    debug: false,
                };
                msg!("args done");
                sol_log_compute_units();

                let encoded_ix = DataAccountInstruction::UpdateDataAccount(update_args);
                let account_metas = vec![
                    AccountMeta::new(*authority.key, true),
                    AccountMeta::new(*data_account.key, false),
                    AccountMeta::new(*metadata_account.key, false),
                    AccountMeta::new_readonly(*system_program.key, false),
                ];
                msg!("metas done");
                let instruction =
                    Instruction::new_with_borsh(*data_program.key, &encoded_ix, account_metas);
                msg!("instruction done");
                sol_log_compute_units();
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
            IdentityInstruction::AppendIdentityTop(args) => {
                msg!("AppendIdentityTop");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                let seed = hash(&args.identity.to_bytes()).to_bytes();
                let top_seed = u64::from_le_bytes(seed[8..16].try_into().unwrap());
                let top_idx = top_seed % (accounts.len() - 5) as u64;
                let top_account = &accounts[5 + top_idx as usize];

                let hex_num: u64 = ((top_seed as f64).sin() * 16777215.).abs().floor() as u64;
                let hex_str = format!("{:x}", hex_num);
                let top = &top_account.try_borrow_data()?[..];
                let mut top_str = std::str::from_utf8(top).unwrap().to_string();

                let idxs: Vec<_> = top_str.match_indices("#").map(|(i, _)| i).collect();
                idxs.iter().for_each(|idx| {
                    if top_str.chars().nth(*idx + 4).unwrap() == '"' {
                        top_str.replace_range(*idx + 1..*idx + 4, &hex_str[..3]);
                    } else {
                        top_str.replace_range(*idx + 1..*idx + 7, &hex_str);
                    }
                });

                // update with new value
                let update_args = UpdateDataAccountArgs {
                    data: top_str.as_bytes().to_vec(),
                    offset: data_account.data_len() as u64,
                    data_type: DataTypeOption::HTML,
                    realloc_down: true,
                    verify_flag: false,
                    debug: false,
                };
                msg!("args done");
                sol_log_compute_units();

                let encoded_ix = DataAccountInstruction::UpdateDataAccount(update_args);
                let account_metas = vec![
                    AccountMeta::new(*authority.key, true),
                    AccountMeta::new(*data_account.key, false),
                    AccountMeta::new(*metadata_account.key, false),
                    AccountMeta::new_readonly(*system_program.key, false),
                ];
                msg!("metas done");
                let instruction =
                    Instruction::new_with_borsh(*data_program.key, &encoded_ix, account_metas);
                msg!("instruction done");
                sol_log_compute_units();
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
            IdentityInstruction::AppendIdentityEyes(args) => {
                msg!("AppendIdentityEyes");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                let seed = hash(&args.identity.to_bytes()).to_bytes();
                let eyes_seed = u64::from_le_bytes(seed[16..24].try_into().unwrap());
                let eyes_idx = eyes_seed % (accounts.len() - 5) as u64;
                let eyes_account = &accounts[5 + eyes_idx as usize];

                let hex_num: u64 = ((eyes_seed as f64).sin() * 16777215.).abs().floor() as u64;
                let hex_str = format!("{:x}", hex_num);
                let eyes = &eyes_account.try_borrow_data()?[..];
                let mut eyes_str = std::str::from_utf8(eyes).unwrap().to_string();

                let idxs: Vec<_> = eyes_str.match_indices("#").map(|(i, _)| i).collect();
                idxs.iter().for_each(|idx| {
                    if eyes_str.chars().nth(*idx + 4).unwrap() == '"' {
                        eyes_str.replace_range(*idx + 1..*idx + 4, &hex_str[..3]);
                    } else {
                        eyes_str.replace_range(*idx + 1..*idx + 7, &hex_str);
                    }
                });

                // update with new value
                let update_args = UpdateDataAccountArgs {
                    data: eyes_str.as_bytes().to_vec(),
                    offset: data_account.data_len() as u64,
                    data_type: DataTypeOption::HTML,
                    realloc_down: true,
                    verify_flag: false,
                    debug: false,
                };
                msg!("args done");
                sol_log_compute_units();

                let encoded_ix = DataAccountInstruction::UpdateDataAccount(update_args);
                let account_metas = vec![
                    AccountMeta::new(*authority.key, true),
                    AccountMeta::new(*data_account.key, false),
                    AccountMeta::new(*metadata_account.key, false),
                    AccountMeta::new_readonly(*system_program.key, false),
                ];
                msg!("metas done");
                let instruction =
                    Instruction::new_with_borsh(*data_program.key, &encoded_ix, account_metas);
                msg!("instruction done");
                sol_log_compute_units();
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
            IdentityInstruction::AppendIdentityMouth(args) => {
                msg!("AppendIdentityMouth");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                let seed = hash(&args.identity.to_bytes()).to_bytes();
                let mouth_seed = u64::from_le_bytes(seed[24..].try_into().unwrap());
                let mouth_idx = mouth_seed % (accounts.len() - 5) as u64;
                let mouth_account = &accounts[5 + mouth_idx as usize];

                let hex_num: u64 = ((mouth_seed as f64).sin() * 16777215.).abs().floor() as u64;
                let hex_str = format!("{:x}", hex_num);
                let mouth = &mouth_account.try_borrow_data()?[..];
                let mut mouth_str = std::str::from_utf8(mouth).unwrap().to_string();

                let idxs: Vec<_> = mouth_str.match_indices("#").map(|(i, _)| i).collect();
                idxs.iter().for_each(|idx| {
                    if mouth_str.chars().nth(*idx + 4).unwrap() == '"' {
                        mouth_str.replace_range(*idx + 1..*idx + 4, &hex_str[..3]);
                    } else {
                        mouth_str.replace_range(*idx + 1..*idx + 7, &hex_str);
                    }
                });

                // update with new value
                let update_args = UpdateDataAccountArgs {
                    data: mouth_str.as_bytes().to_vec(),
                    offset: data_account.data_len() as u64,
                    data_type: DataTypeOption::HTML,
                    realloc_down: true,
                    verify_flag: false,
                    debug: false,
                };
                msg!("args done");
                sol_log_compute_units();

                let encoded_ix = DataAccountInstruction::UpdateDataAccount(update_args);
                let account_metas = vec![
                    AccountMeta::new(*authority.key, true),
                    AccountMeta::new(*data_account.key, false),
                    AccountMeta::new(*metadata_account.key, false),
                    AccountMeta::new_readonly(*system_program.key, false),
                ];
                msg!("metas done");
                let instruction =
                    Instruction::new_with_borsh(*data_program.key, &encoded_ix, account_metas);
                msg!("instruction done");
                sol_log_compute_units();
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
            IdentityInstruction::CompleteIdentity(_args) => {
                msg!("CompleteIdentity");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                // update with new value
                let update_args = UpdateDataAccountArgs {
                    data: SVGEND.to_vec(),
                    offset: data_account.data_len() as u64,
                    data_type: DataTypeOption::HTML,
                    realloc_down: true,
                    verify_flag: false,
                    debug: false,
                };
                msg!("args done");
                sol_log_compute_units();

                let encoded_ix = DataAccountInstruction::UpdateDataAccount(update_args);
                let account_metas = vec![
                    AccountMeta::new(*authority.key, true),
                    AccountMeta::new(*data_account.key, false),
                    AccountMeta::new(*metadata_account.key, false),
                    AccountMeta::new_readonly(*system_program.key, false),
                ];
                msg!("metas done");
                let instruction =
                    Instruction::new_with_borsh(*data_program.key, &encoded_ix, account_metas);
                msg!("instruction done");
                sol_log_compute_units();
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
