use crate::{
    error::LuckError,
    instruction::{DataAccountInstruction, LuckInstruction},
    state::{DataTypeOption, UpdateDataAccountArgs, DATA_END_OFFSET, METADATA_SIZE},
};
use borsh::BorshDeserialize;
use solana_program::instruction::{AccountMeta, Instruction};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    hash::hash,
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
        let instruction = LuckInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        match instruction {
            LuckInstruction::TestLuck(_args) => {
                msg!("TestLuck");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let metadata_account = next_account_info(accounts_iter)?;
                let data_program = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                if !authority.is_signer {
                    return Err(LuckError::NotSigner.into());
                }

                if !authority.is_writable
                    || !data_account.is_writable
                    || !metadata_account.is_writable
                {
                    return Err(LuckError::NotWriteable.into());
                }

                if metadata_account.data_len() < METADATA_SIZE {
                    return Err(LuckError::NoAccountLength.into());
                }

                // get random by checking parity of SHA256 hash of current timestamp
                let clock = Clock::get()?;
                let current_timestamp = clock.unix_timestamp;
                let seed = hash(&current_timestamp.to_le_bytes());
                let val = seed.to_bytes();
                let flag: bool = (val[val.len() - 1] & 1) == 0;

                // find start index of when number starts
                let data = data_account.try_borrow_data()?;
                let end = data_account.data_len() - DATA_END_OFFSET;
                let mut start = end;
                while data[start] != b'>' {
                    start -= 1;
                }
                let offset = start + 1;
                let mut curr: Vec<u8>;

                // if flag is 0, then reset to 0
                // otherwise parse current number and add one to it
                if !flag {
                    curr = b"0".to_vec();
                } else {
                    let prev: u64 = std::str::from_utf8(&data[offset..end])
                        .expect("Not UTF")
                        .parse()
                        .expect("NaN");
                    curr = (prev + 1).to_string().as_bytes().to_vec()
                }
                curr.append(&mut b"</body></html>".to_vec());

                // update with new value
                let update_args = UpdateDataAccountArgs {
                    data: curr,
                    offset: offset as u64,
                    data_type: DataTypeOption::HTML,
                    realloc_down: true,
                    verify_flag: false,
                    debug: true,
                };
                drop(data);
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
