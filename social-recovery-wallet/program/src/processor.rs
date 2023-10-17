use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction::{assign, create_account},
    sysvar::Sysvar,
};
use spl_token::instruction::{close_account, transfer};

use crate::instruction::RecoveryInstruction;
use crate::{error::RecoveryError, state::ProfileHeader};

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = RecoveryInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        let account_info_iter = &mut accounts.iter();

        match instruction {
            RecoveryInstruction::InitializeSocialWallet {
                acct_len,
                recovery_threshold,
            } => {
                msg!("Instruction: InitializeSocialWallet");

                let profile_info = next_account_info(account_info_iter)?;
                let authority_info = next_account_info(account_info_iter)?;
                let system_program_info = next_account_info(account_info_iter)?;

                // Store list of guardians (social recovery list)
                let mut guardians = Vec::with_capacity(acct_len.into());
                for _ in 0..acct_len {
                    let guardian_account_info = next_account_info(account_info_iter)?;
                    guardians.push(*guardian_account_info.key);
                }

                /*
                    allocate space for 10 recovery accounts (guardian) in profile account data
                    1: recovery_threshold
                    4: size of vector of guardians
                    32 * 10: space for 10 guardians
                */

                let data_len = (1 + 4 + 32 * 10) as u64;
                msg!("Number of bytes of data: {}", data_len);

                // find pda of profile account for given authority
                let (profile_pda, profile_bump_seed) = Pubkey::find_program_address(
                    &[b"profile", authority_info.key.as_ref()],
                    program_id,
                );

                if profile_pda != *profile_info.key {
                    return Err(ProgramError::InvalidSeeds);
                }

                // create profile account inside profile pda iff pda account does not exist
                if **profile_info.try_borrow_lamports()? <= 0 {
                    msg!("no lamports, creating new PDA account....");
                    let create_profile_account_instruction = create_account(
                        authority_info.key,
                        &profile_pda,
                        Rent::get()?.minimum_balance(data_len as usize),
                        data_len.into(),
                        program_id,
                    );

                    // Invoke CPI to create profile account
                    invoke_signed(
                        &create_profile_account_instruction,
                        &[
                            profile_info.clone(),
                            authority_info.clone(),
                            system_program_info.clone(),
                        ],
                        &[&[
                            b"profile",
                            authority_info.key.as_ref(),
                            &[profile_bump_seed],
                        ]],
                    )?;
                } else if profile_info.data_is_empty() {
                    msg!("no space in PDA account, allocating space....");

                    let assign_instruction = assign(&profile_pda, program_id);
                    // Invoke CPI to assign my program to own PDA
                    invoke_signed(
                        &assign_instruction,
                        &[
                            profile_info.clone(),
                            authority_info.clone(),
                            system_program_info.clone(),
                        ],
                        &[&[
                            b"profile",
                            authority_info.key.as_ref(),
                            &[profile_bump_seed],
                        ]],
                    )?;

                    profile_info.realloc(data_len as usize, false)?;
                }

                // Create ProfileHeader and Serialize using borsh
                let initial_data = ProfileHeader {
                    recovery_threshold,
                    guardians,
                };
                let initial_data_len = initial_data.try_to_vec()?.len();
                msg!("data len: {}", initial_data_len);
                msg!("Serializing...");
                initial_data
                    .serialize(&mut &mut profile_info.try_borrow_mut_data()?[..initial_data_len])?;

                Ok(())
            }
            RecoveryInstruction::AddToRecoveryList { acct_len } => {
                msg!("Instruction: AddToRecovery");

                let profile_info = next_account_info(account_info_iter)?;
                let authority_info = next_account_info(account_info_iter)?;

                // find pda of profile account for given authority
                let (profile_pda, _) = Pubkey::find_program_address(
                    &[b"profile", authority_info.key.as_ref()],
                    program_id,
                );

                if profile_pda != *profile_info.key {
                    return Err(ProgramError::InvalidSeeds);
                }

                // Add the guardian data into profile program data
                let profile_data = &mut profile_info.try_borrow_mut_data()?;
                let old_acct_len = profile_data[1];
                let old_data_len = (old_acct_len * 32 + 5) as usize;

                // assert that total number of guardians are less than or equal to 10
                if old_acct_len + acct_len > 10 {
                    return Err(RecoveryError::TooManyGuardians.into());
                }

                // Deserialize into ProfileHeader from profile program data
                let mut initial_data =
                    ProfileHeader::try_from_slice(&profile_data[..old_data_len])?;

                // Log existing guardians
                msg!("Old Guardian List: ");
                for i in 0..old_acct_len {
                    msg!(
                        "{}: {:x?}",
                        i,
                        initial_data.guardians[i as usize].to_bytes()
                    );
                }

                // Add new guardian into deserialized struct
                for i in 0..acct_len {
                    let guardian_account_info = next_account_info(account_info_iter)?;
                    msg!(
                        "newly added guardian {}: {:x?}",
                        i,
                        guardian_account_info.key.to_bytes()
                    );
                    initial_data.guardians.push(*guardian_account_info.key);
                }

                // Log new guardians after add
                msg!("New Guardian List: ");
                for i in 0..old_acct_len + acct_len {
                    msg!(
                        "{}: {:x?}",
                        i,
                        initial_data.guardians[i as usize].to_bytes()
                    );
                }

                // Serialize struct (after adding guardians) into profile program data
                let initial_data_len = initial_data.try_to_vec()?.len();
                msg!("data len: {}", initial_data_len);
                msg!("Serializing...");
                let mut writer = &mut profile_data[..initial_data_len];
                initial_data.serialize(&mut writer)?;

                Ok(())
            }
            RecoveryInstruction::ModifyRecoveryList { acct_len } => {
                msg!("Instruction: ModifyRecoveryList");

                let profile_info = next_account_info(account_info_iter)?;
                let authority_info = next_account_info(account_info_iter)?;

                // find pda of profile account for given authority
                let (profile_pda, _) = Pubkey::find_program_address(
                    &[b"profile", authority_info.key.as_ref()],
                    program_id,
                );

                if profile_pda != *profile_info.key {
                    return Err(ProgramError::InvalidSeeds);
                }

                // Add the guardian data into profile program data
                let profile_data = &mut profile_info.try_borrow_mut_data()?;
                let old_acct_len = profile_data[1];
                let old_data_len = (old_acct_len * 32 + 5) as usize;

                // Deserialize into ProfileHeader from profile program data
                let mut initial_data =
                    ProfileHeader::try_from_slice(&profile_data[..old_data_len])?;

                // Log existing guardians
                msg!("Old Guardian List: ");
                for i in 0..old_acct_len {
                    msg!(
                        "{}: {:x?}",
                        i,
                        initial_data.guardians[i as usize].to_bytes()
                    );
                }

                // Add new guardian into deserialized struct
                for _ in 0..acct_len {
                    let old_guardian_info = next_account_info(account_info_iter)?;
                    let new_guardian_info = next_account_info(account_info_iter)?;
                    let old_guardian_pk = old_guardian_info.key;
                    let new_guardian_pk = new_guardian_info.key;

                    // check if the key to be modified is in the data
                    if !initial_data.guardians.contains(old_guardian_pk) {
                        return Err(RecoveryError::ModifiedGuardianNotFound.into());
                    }

                    // get index of old guardian key in the data
                    let index = initial_data
                        .guardians
                        .iter()
                        .position(|&k| k == *old_guardian_pk)
                        .unwrap();

                    // replace old with new key in the index of old key
                    initial_data.guardians[index] = *new_guardian_pk;
                    msg!(
                        "replace old {:x?} with new {:x?}",
                        old_guardian_pk.to_bytes(),
                        new_guardian_pk.to_bytes()
                    );
                }

                // print all guardians
                msg!("New Guardian List: ");
                for i in 0..initial_data.guardians.len() {
                    msg!("{}: {:x?}", i, initial_data.guardians[i].to_bytes());
                }

                // Serialize struct (after adding guardians) into profile program data
                let initial_data_len = initial_data.try_to_vec()?.len();
                msg!("data len: {}", initial_data_len);
                msg!("Serializing...");
                let mut writer = &mut profile_data[..initial_data_len];
                initial_data.serialize(&mut writer)?;

                Ok(())
            }
            RecoveryInstruction::DeleteFromRecoveryList { acct_len } => {
                msg!("Instruction: DeleteFromRecoveryList");

                let profile_info = next_account_info(account_info_iter)?;
                let authority_info = next_account_info(account_info_iter)?;

                // find pda of profile account for given authority
                let (profile_pda, _) = Pubkey::find_program_address(
                    &[b"profile", authority_info.key.as_ref()],
                    program_id,
                );

                if profile_pda != *profile_info.key {
                    return Err(ProgramError::InvalidSeeds);
                }

                // Add the guardian data into profile program data
                let profile_data = &mut profile_info.try_borrow_mut_data()?;
                let old_acct_len = profile_data[1];
                let recovery_threshold = profile_data[0];
                let old_data_len = (old_acct_len * 32 + 5) as usize;

                msg!("old acct len: {}", old_acct_len);
                msg!("acct_len: {}", acct_len);
                msg!("recover thres: {}", recovery_threshold);

                // // assert that total number of guardians are greater than or equal to the recovery threshold
                // if old_acct_len - acct_len < recovery_threshold {
                //     return Err(RecoveryError::NotEnoughGuardians.into());
                // }

                // Deserialize into ProfileHeader from profile program data
                let mut initial_data =
                    ProfileHeader::try_from_slice(&profile_data[..old_data_len])?;

                // print all old guardians
                msg!("Old Guardian List: ");
                for i in 0..initial_data.guardians.len() {
                    msg!("{}: {:x?}", i, initial_data.guardians[i].to_bytes());
                }

                // Delete guardian from deserialized struct
                for _ in 0..acct_len {
                    let guardian_info = next_account_info(account_info_iter)?;
                    let guardian_pk = guardian_info.key;

                    // check if the key to be deleted is in the data
                    if !initial_data.guardians.contains(guardian_pk) {
                        return Err(RecoveryError::DeletedGuardianNotFound.into());
                    }

                    // get index of guardian key to be deleted in the data
                    let index = initial_data
                        .guardians
                        .iter()
                        .position(|&k| k == *guardian_pk)
                        .unwrap();

                    // replace old with new key in the index of old key
                    initial_data.guardians.remove(index);
                    msg!("deleted guardian {:x?}", guardian_pk.to_bytes());
                }

                // print all guardians
                msg!("New Guardian List: ");
                for i in 0..initial_data.guardians.len() {
                    msg!("{}: {:x?}", i, initial_data.guardians[i].to_bytes());
                }

                // Serialize struct (after adding guardians) into profile program data
                let initial_data_len = initial_data.try_to_vec()?.len();
                msg!("data len: {}", initial_data_len);
                msg!("Serializing...");
                let mut writer = &mut profile_data[..initial_data_len];
                initial_data.serialize(&mut writer)?;

                // Zero out the deleted space
                for i in initial_data_len..old_data_len {
                    profile_data[i] = 0;
                }

                Ok(())
            }
            RecoveryInstruction::ModifyRecoveryThreshold { new_threshold } => {
                msg!("Instruction: ModifyRecoveryThreshold");

                let profile_info = next_account_info(account_info_iter)?;
                let authority_info = next_account_info(account_info_iter)?;

                // find pda of profile account for given authority
                let (profile_pda, _) = Pubkey::find_program_address(
                    &[b"profile", authority_info.key.as_ref()],
                    program_id,
                );

                if profile_pda != *profile_info.key {
                    return Err(ProgramError::InvalidSeeds);
                }

                if new_threshold > 10 || new_threshold <= 0 {
                    return Err(RecoveryError::InvalidRecoveryThreshold.into());
                }

                // Add the guardian data into profile program data
                let profile_data = &mut profile_info.try_borrow_mut_data()?;
                profile_data[0] = new_threshold;

                Ok(())
            }
            RecoveryInstruction::RecoverWallet { acct_len } => {
                msg!("Instruction: RecoverWallet");

                let profile_info = next_account_info(account_info_iter)?;
                let new_profile_info = next_account_info(account_info_iter)?;
                let authority_info = next_account_info(account_info_iter)?;
                let new_authority_info = next_account_info(account_info_iter)?;

                // check if authorities are signers
                if !new_authority_info.is_signer {
                    return Err(ProgramError::InvalidArgument);
                }

                // find pda of profile account for given authority
                let (profile_pda, _) = Pubkey::find_program_address(
                    &[b"profile", authority_info.key.as_ref()],
                    program_id,
                );
                if profile_pda != *profile_info.key {
                    return Err(ProgramError::InvalidSeeds);
                }
                msg!("Old Profile PDA: {}", profile_pda);

                let profile_data = &mut profile_info.try_borrow_mut_data()?;
                let recovery_threshold = profile_data[0];
                let old_acct_len = profile_data[1];
                let old_data_len = (old_acct_len * 32 + 5) as usize;

                // Deserialize into ProfileHeader from profile program data
                let initial_data = ProfileHeader::try_from_slice(&profile_data[..old_data_len])?;
                let mut guardian_infos = Vec::with_capacity(acct_len.into());

                for _ in 0..acct_len {
                    let guardian_info = next_account_info(account_info_iter)?;
                    let guardian_pk = guardian_info.key;

                    // check if the input guardian key is authorized (in profile program data)
                    if !initial_data.guardians.contains(guardian_pk) {
                        return Err(RecoveryError::NotAuthorizedToRecover.into());
                    }

                    // check if guardian passed in is a signer
                    if !guardian_info.is_signer {
                        return Err(RecoveryError::NotAuthorizedToRecover.into());
                    }

                    guardian_infos.push(guardian_info);
                }

                let guardians = initial_data.guardians.clone();

                // find pda of new profile account for new authority
                let (new_profile_pda, _) = Pubkey::find_program_address(
                    &[b"profile", new_authority_info.key.as_ref()],
                    program_id,
                );
                msg!("New Profile PDA: {}", new_profile_pda);

                // Create ProfileHeader and Serialize using borsh
                let initial_data = ProfileHeader {
                    recovery_threshold,
                    guardians,
                };
                let initial_data_len = initial_data.try_to_vec()?.len();
                msg!("data len: {}", initial_data_len);
                msg!("Serializing...");
                initial_data.serialize(
                    &mut &mut new_profile_info.try_borrow_mut_data()?[..initial_data_len],
                )?;

                Ok(())
            }

            RecoveryInstruction::TransferToken {
                amount,
                recovery_mode,
            } => {
                msg!("Instruction: TransferToken");

                let profile_info = next_account_info(account_info_iter)?;
                let authority_info = next_account_info(account_info_iter)?;
                let new_authority_info = next_account_info(account_info_iter)?;
                let old_token_account_info = next_account_info(account_info_iter)?;
                let new_token_account_info = next_account_info(account_info_iter)?;
                let token_program_info = next_account_info(account_info_iter)?;

                if !new_authority_info.is_signer {
                    return Err(ProgramError::InvalidArgument);
                }

                // find pda of profile account for given authority
                let (profile_pda, bump_seed) = Pubkey::find_program_address(
                    &[b"profile", authority_info.key.as_ref()],
                    program_id,
                );
                if profile_pda != *profile_info.key {
                    return Err(ProgramError::InvalidSeeds);
                }
                msg!("amount: {}", amount);

                msg!("transfering mint...");
                let transfer_ix = transfer(
                    token_program_info.key,
                    old_token_account_info.key,
                    new_token_account_info.key,
                    &profile_pda,
                    &[&profile_pda],
                    amount,
                )?;

                invoke_signed(
                    &transfer_ix,
                    &[
                        token_program_info.clone(),
                        old_token_account_info.clone(),
                        new_token_account_info.clone(),
                        authority_info.clone(),
                        profile_info.clone(),
                    ],
                    &[&[b"profile", authority_info.key.as_ref(), &[bump_seed]]],
                )?;
                msg!("finished transfer of mint");

                // close sender token account
                if recovery_mode == 1 {
                    msg!("closing account...");
                    let close_ix = close_account(
                        token_program_info.key,
                        old_token_account_info.key,
                        new_token_account_info.key,
                        &profile_pda,
                        &[&profile_pda],
                    )?;

                    invoke_signed(
                        &close_ix,
                        &[
                            token_program_info.clone(),
                            old_token_account_info.clone(),
                            new_token_account_info.clone(),
                            authority_info.clone(),
                            profile_info.clone(),
                        ],
                        &[&[b"profile", authority_info.key.as_ref(), &[bump_seed]]],
                    )?;
                    msg!("closed");
                }

                Ok(())
            }

            RecoveryInstruction::TransferNativeSOL {
                amount,
                recovery_mode,
            } => {
                msg!("Instruction: TransferNativeSOL");

                let profile_info = next_account_info(account_info_iter)?;
                let new_profile_info = next_account_info(account_info_iter)?;
                let new_authority_info = next_account_info(account_info_iter)?;

                if !new_authority_info.is_signer {
                    return Err(ProgramError::InvalidArgument);
                }

                let balance = **profile_info.try_borrow_lamports()?;
                if balance < amount {
                    return Err(RecoveryError::InsufficientFundsForTransaction.into());
                }

                let amt;
                if recovery_mode == 1 {
                    amt = balance;
                } else {
                    amt = amount;
                }
                **profile_info.try_borrow_mut_lamports()? -= amt;
                **new_profile_info.try_borrow_mut_lamports()? += amt;
                msg!("amount: {}", amt);

                Ok(())
            }

            RecoveryInstruction::WrapSignInstr {
                acct_len,
                custom_data,
            } => {
                msg!("==========================");
                msg!("Instruction: WrapSignInstr");

                let profile_info = next_account_info(account_info_iter)?;
                let authority_info = next_account_info(account_info_iter)?;
                let custom_program_info = next_account_info(account_info_iter)?;

                msg!("acct_len: {}", acct_len);

                // find pda of profile account for given authority
                let (profile_pda, bump_seed) = Pubkey::find_program_address(
                    &[b"profile", authority_info.key.as_ref()],
                    program_id,
                );
                if profile_pda != *profile_info.key {
                    return Err(ProgramError::InvalidSeeds);
                }

                const DATA_LEN: usize = 1 + 4 + 32 * 10;

                let mut custom_account_infos = Vec::with_capacity(acct_len.into());
                let mut custom_account_metas: Vec<AccountMeta> =
                    Vec::with_capacity(acct_len.into());

                let mut system_account_info: Option<&AccountInfo> = None;
                let mut old_data: [u8; DATA_LEN] = [0; DATA_LEN];
                old_data.copy_from_slice(&profile_info.data.borrow()[..]);

                if *custom_program_info.key == solana_program::system_program::ID {
                    system_account_info = Some(custom_program_info);
                    msg!("Program is SystemProgram owned! ");
                }

                for _ in 0..acct_len {
                    let custom_account_info = next_account_info(account_info_iter)?;
                    let custom_account_info_cloned = custom_account_info.clone();
                    custom_account_infos.push(custom_account_info_cloned);

                    if solana_program::system_program::check_id(custom_account_info.key) {
                        system_account_info = Some(custom_account_info);
                    }

                    let new_meta: AccountMeta = if profile_pda == *custom_account_info.key {
                        AccountMeta::new(*custom_account_info.key, true)
                    } else if custom_account_info.is_writable {
                        AccountMeta::new(*custom_account_info.key, custom_account_info.is_signer)
                    } else {
                        AccountMeta::new_readonly(
                            *custom_account_info.key,
                            custom_account_info.is_signer,
                        )
                    };
                    // msg!("account meta {}: {:?}", i, new_meta);
                    custom_account_metas.push(new_meta);
                }

                if system_account_info.is_some()
                    || *custom_program_info.key == solana_program::system_program::ID
                {
                    profile_info.realloc(0, false)?;
                    profile_info.assign(&solana_program::system_program::ID);
                }

                msg!("{:?}", custom_data);
                let instr = Instruction::new_with_bytes(
                    *custom_program_info.key,
                    custom_data.as_slice(),
                    custom_account_metas,
                );
                invoke_signed(
                    &instr,
                    custom_account_infos.as_slice(),
                    &[&[b"profile", authority_info.key.as_ref(), &[bump_seed]]],
                )?;
                msg!("invoked_signed!");
                if system_account_info.is_some()
                    || *custom_program_info.key == solana_program::system_program::ID
                {
                    let assign_ix = assign(&profile_pda, &program_id);
                    invoke_signed(
                        &assign_ix,
                        &[profile_info.clone(), system_account_info.unwrap().clone()],
                        &[&[b"profile", authority_info.key.as_ref(), &[bump_seed]]],
                    )?;
                    profile_info.realloc(DATA_LEN, false)?;
                    profile_info.data.borrow_mut()[..].copy_from_slice(&old_data);
                }
                Ok(())
            }
        }
    }
}
