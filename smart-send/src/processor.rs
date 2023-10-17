use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};
use std::str::FromStr;

use crate::{error::SmartSendError, state::SmartSendData};
use crate::{instruction::SmartSendInstruction, state::State};

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = SmartSendInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        match instruction {
            SmartSendInstruction::RefundAll { buffer_seed } => {
                msg!("Instruction: RefundAll");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let payer = next_account_info(accounts_iter)?;
                let (pda_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if pda_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }
                let mut ss_data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;
                if ss_data.state != State::AwaitingDeposits && ss_data.state != State::Refunding {
                    return Err(SmartSendError::IncorrectState.into());
                }

                for i in 0..ss_data.inputs.len() + 1 {
                    if i == ss_data.inputs.len() {
                        return Err(SmartSendError::NotAuthorized.into());
                    }
                    if *payer.key == ss_data.inputs[i] {
                        break;
                    }
                    if *payer.key == ss_data.payer {
                        break;
                    }
                }

                for i in 0..ss_data.inputs.len() {
                    let input = next_account_info(accounts_iter)?;
                    if ss_data.inputs[i] != *input.key {
                        return Err(SmartSendError::IncorrectAuthBuff.into());
                    }

                    if !ss_data.input_success[i] {
                        continue;
                    }
                    if ss_data.output_success[i] {
                        continue;
                    }

                    let in_lamports = input.lamports();

                    **input.lamports.borrow_mut() = in_lamports
                        .checked_add(ss_data.input_amounts[i])
                        .ok_or(SmartSendError::Overflow)?;

                    **pda_account.lamports.borrow_mut() = pda_account
                        .lamports()
                        .checked_sub(ss_data.input_amounts[i])
                        .ok_or(SmartSendError::Underflow)?;
                }
                msg!("finished all refunds");
                ss_data.state = State::Closed;
                ss_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())
            }

            SmartSendInstruction::CloseAccount { buffer_seed } => {
                msg!("Instruction: CloseAccount");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let payer = next_account_info(accounts_iter)?;
                let (pda_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if pda_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }
                let ss_data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;
                if ss_data.state != State::Closed {
                    return Err(SmartSendError::IncorrectState.into());
                }

                let amt = pda_account.lamports();
                **pda_account.lamports.borrow_mut() = 0;

                **payer.lamports.borrow_mut() = payer
                    .lamports()
                    .checked_add(amt)
                    .ok_or(SmartSendError::Overflow)?;

                pda_account.try_borrow_mut_data()?.fill(0);
                Ok(())
            }
            SmartSendInstruction::SmartDeposit {
                amount,
                buffer_seed,
            } => {
                msg!("Instruction: SmartDeposit");

                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let authority = next_account_info(accounts_iter)?;
                let sys_prog = next_account_info(accounts_iter)?;

                let (authorized_buffer_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if authorized_buffer_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }

                let mut ss_data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;
                if ss_data.state != State::AwaitingDeposits {
                    return Err(SmartSendError::IncorrectState.into());
                }

                let transferix = solana_program::system_instruction::transfer(
                    authority.key,
                    pda_account.key,
                    amount,
                );

                solana_program::program::invoke(
                    &transferix,
                    &[authority.clone(), pda_account.clone(), sys_prog.clone()],
                )?;

                for i in 0..ss_data.inputs.len() + 1 {
                    if i == ss_data.inputs.len() {
                        return Err(SmartSendError::IncorrectInput.into());
                    }
                    if *authority.key == ss_data.inputs[i] {
                        if amount >= ss_data.input_amounts[i] {
                            ss_data.input_success[i] = true;
                            break;
                        } else {
                            msg!(
                                "Required {:?}, provided {:?}",
                                ss_data.input_amounts[i],
                                amount
                            );
                            return Err(SmartSendError::InsufficientInput.into());
                        }
                    }
                }
                msg!(
                    "True values: {:?}",
                    ss_data
                        .input_success
                        .clone()
                        .into_iter()
                        .filter(|b| *b)
                        .count()
                );
                msg!(
                    "False values: {:?}",
                    ss_data
                        .input_success
                        .clone()
                        .into_iter()
                        .filter(|b| !*b)
                        .count()
                );

                let deposits_left = ss_data
                    .input_success
                    .clone()
                    .into_iter()
                    .filter(|b| !*b)
                    .count();

                if deposits_left == 0 {
                    ss_data.state = State::Withdrawing;
                }

                ss_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())
            }
            SmartSendInstruction::SmartSend { buffer_seed } => {
                msg!("Instruction: SmartSend");

                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let _authority = next_account_info(accounts_iter)?;

                let (pda_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if pda_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }
                let mut ss_data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;
                if ss_data.state != State::Withdrawing {
                    return Err(SmartSendError::IncorrectState.into());
                }

                for i in 0..ss_data.outputs.len() {
                    let out = next_account_info(accounts_iter)?;
                    if ss_data.outputs[i] != *out.key {
                        return Err(SmartSendError::IncorrectAuthBuff.into());
                    }
                    let out_lamports = out.lamports();
                    **out.lamports.borrow_mut() = out_lamports
                        .checked_add(ss_data.output_amounts[i])
                        .ok_or(SmartSendError::Overflow)?;

                    **pda_account.lamports.borrow_mut() = pda_account
                        .lamports()
                        .checked_sub(ss_data.output_amounts[i])
                        .ok_or(SmartSendError::Underflow)?;
                }

                msg!("finished all transfers");

                ss_data.state = State::Closed;
                ss_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())

                //end
            }

            SmartSendInstruction::InitializeSmartSend {
                input_amount,
                output_amount,
                buffer_seed,
            } => {
                let temp_pubkey =
                    Pubkey::from_str("3iUBKuvbRMPNLeF33QJHYia7ZBNDWqiccy35MXBRQd1f").unwrap();

                msg!("Instruction: InitializeSmartSend");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let fee_payer = next_account_info(accounts_iter)?;
                let sys_prog = next_account_info(accounts_iter)?;

                let a = SmartSendData {
                    inputs: vec![temp_pubkey; input_amount],
                    input_amounts: vec![0; input_amount],
                    input_success: vec![false; input_amount],
                    outputs: vec![temp_pubkey; output_amount],
                    output_amounts: vec![0; output_amount],
                    output_success: vec![false; output_amount],
                    state: State::InitializingBoth,
                    payer: *fee_payer.key,
                    inputs_initialized: 0,
                    outputs_initialized: 0,
                };

                let (authorized_buffer_key, bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if authorized_buffer_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }

                msg!("starting invoke signed");

                let buffer_size = a.try_to_vec()?.len();

                let instr = solana_program::system_instruction::create_account(
                    fee_payer.key,
                    pda_account.key,
                    Rent::get()?.minimum_balance(buffer_size),
                    buffer_size.try_into().unwrap(),
                    program_id,
                );

                invoke_signed(
                    &instr,
                    &[pda_account.clone(), fee_payer.clone(), sys_prog.clone()],
                    &[&[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                        &[bump_seed],
                    ]],
                )?;

                msg!("Finished invoke signed");
                a.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())
            }

            SmartSendInstruction::InitializeInputs {
                input_accs,
                input_vals,
                buffer_seed,
            } => {
                msg!("Instruction: InitializeInputs");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let authority = next_account_info(accounts_iter)?;

                let (authorized_buffer_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if authorized_buffer_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }

                let mut data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;
                if *authority.key != data.payer {
                    return Err(SmartSendError::NotAuthorized.into());
                }
                if data.state != State::InitializingInputs && data.state != State::InitializingBoth
                {
                    return Err(SmartSendError::IncorrectState.into());
                }
                if data.inputs_initialized != 0 {
                    return Err(SmartSendError::IncorrectState.into());
                }
                data.inputs = input_accs.clone();
                data.input_amounts = input_vals;

                if data.state == State::InitializingBoth {
                    data.state = State::InitializingOutputs;
                } else {
                    let input_sum: u128 = data.input_amounts.iter().map(|x| *x as u128).sum();
                    let output_sum: u128 = data.output_amounts.iter().map(|x| *x as u128).sum();
                    if input_sum < output_sum {
                        return Err(SmartSendError::InsufficientInputs.into());
                    }
                    data.state = State::AwaitingDeposits;
                }

                data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())
            }

            SmartSendInstruction::InitializeOutputs {
                output_accs,
                output_vals,
                buffer_seed,
            } => {
                msg!("Instruction: InitializeOutputs");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let authority = next_account_info(accounts_iter)?;

                let (authorized_buffer_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if authorized_buffer_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }

                let mut data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;
                if *authority.key != data.payer {
                    return Err(SmartSendError::NotAuthorized.into());
                }
                if data.state != State::InitializingOutputs && data.state != State::InitializingBoth
                {
                    return Err(SmartSendError::IncorrectState.into());
                }
                if data.outputs_initialized != 0 {
                    return Err(SmartSendError::IncorrectState.into());
                }

                data.outputs = output_accs.clone();
                data.output_amounts = output_vals;

                if data.state == State::InitializingBoth {
                    data.state = State::InitializingInputs;
                } else {
                    let input_sum: u128 = data.input_amounts.iter().map(|x| *x as u128).sum();
                    let output_sum: u128 = data.output_amounts.iter().map(|x| *x as u128).sum();
                    if input_sum < output_sum {
                        return Err(SmartSendError::InsufficientInputs.into());
                    }
                    data.state = State::AwaitingDeposits
                }

                data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())
            }

            SmartSendInstruction::InitializeInput {
                input_acc,
                input_val,
                buffer_seed,
            } => {
                msg!("Instruction: InitializeInput");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let authority = next_account_info(accounts_iter)?;

                let (authorized_buffer_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );

                if authorized_buffer_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }

                let mut data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;

                if *authority.key != data.payer {
                    return Err(SmartSendError::NotAuthorized.into());
                }

                if data.state != State::InitializingInputs && data.state != State::InitializingBoth
                {
                    return Err(SmartSendError::IncorrectState.into());
                }
                data.inputs[data.inputs_initialized] = input_acc.clone();
                data.input_amounts[data.inputs_initialized] = input_val;
                data.inputs_initialized += 1;

                if data.inputs_initialized == data.inputs.len() {
                    if data.state == State::InitializingBoth {
                        data.state = State::InitializingOutputs;
                    } else {
                        let input_sum: u128 = data.input_amounts.iter().map(|x| *x as u128).sum();
                        let output_sum: u128 = data.output_amounts.iter().map(|x| *x as u128).sum();
                        if input_sum < output_sum {
                            return Err(SmartSendError::InsufficientInputs.into());
                        }
                        data.state = State::AwaitingDeposits
                    }
                }

                data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())
            }

            SmartSendInstruction::InitializeOutput {
                output_acc,
                output_val,
                buffer_seed,
            } => {
                msg!("Instruction: InitializeOutput");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let authority = next_account_info(accounts_iter)?;

                let (authorized_buffer_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if authorized_buffer_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }

                let mut data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;

                if *authority.key != data.payer {
                    return Err(SmartSendError::NotAuthorized.into());
                }
                if data.state != State::InitializingOutputs && data.state != State::InitializingBoth
                {
                    return Err(SmartSendError::IncorrectState.into());
                }
                data.outputs[data.outputs_initialized] = output_acc.clone();
                data.output_amounts[data.outputs_initialized] = output_val;
                data.outputs_initialized += 1;

                if data.outputs_initialized == data.outputs.len() {
                    if data.state == State::InitializingBoth {
                        data.state = State::InitializingInputs;
                    } else {
                        let input_sum: u128 = data.input_amounts.iter().map(|x| *x as u128).sum();
                        let output_sum: u128 = data.output_amounts.iter().map(|x| *x as u128).sum();
                        if input_sum < output_sum {
                            return Err(SmartSendError::InsufficientInputs.into());
                        }
                        data.state = State::AwaitingDeposits
                    }
                }

                data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())
            }

            SmartSendInstruction::Refund {
                buffer_seed,
                done_manually,
            } => {
                msg!("Instruction: Refund");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let payer = next_account_info(accounts_iter)?;
                let mut input = payer;
                if !done_manually {
                    input = next_account_info(accounts_iter)?;
                }
                //let input = next_account_info(accounts_iter)?;
                let (pda_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if pda_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }
                let mut ss_data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;
                if ss_data.state != State::AwaitingDeposits && ss_data.state != State::Refunding {
                    return Err(SmartSendError::IncorrectState.into());
                }

                for i in 0..ss_data.inputs.len() + 1 {
                    if i == ss_data.inputs.len() {
                        return Err(SmartSendError::NotAuthorized.into());
                    }
                    if *payer.key == ss_data.inputs[i] {
                        break;
                    }
                    if *payer.key == ss_data.payer {
                        break;
                    }
                }

                for i in 0..ss_data.inputs.len() + 1 {
                    if i == ss_data.inputs.len() {
                        return Err(SmartSendError::IncorrectInput.into());
                    }
                    if ss_data.inputs[i] != *input.key {
                        continue;
                    }

                    if !ss_data.input_success[i] {
                        return Err(SmartSendError::IncorrectInput.into());
                    }

                    let in_lamports = input.lamports();

                    **input.lamports.borrow_mut() = in_lamports
                        .checked_add(ss_data.input_amounts[i])
                        .ok_or(SmartSendError::Overflow)?;

                    **pda_account.lamports.borrow_mut() = pda_account
                        .lamports()
                        .checked_sub(ss_data.input_amounts[i])
                        .ok_or(SmartSendError::Underflow)?;

                    ss_data.input_success[i] = false;
                    break;
                }

                let refunds_left = ss_data
                    .input_success
                    .clone()
                    .into_iter()
                    .filter(|b| *b)
                    .count();
                if refunds_left == 0 {
                    ss_data.state = State::Closed;
                } else {
                    ss_data.state = State::Refunding;
                }

                ss_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())
            }

            SmartSendInstruction::Withdraw {
                buffer_seed,
                done_manually,
            } => {
                msg!("Instruction: Withdraw");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;
                let payer = next_account_info(accounts_iter)?;
                let mut output = payer;
                if !done_manually {
                    output = next_account_info(accounts_iter)?;
                }

                let (pda_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if pda_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }
                let mut ss_data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;
                if ss_data.state != State::Withdrawing {
                    return Err(SmartSendError::IncorrectState.into());
                }

                for i in 0..ss_data.outputs.len() + 1 {
                    if i == ss_data.outputs.len() {
                        return Err(SmartSendError::IncorrectInput.into());
                    }
                    if ss_data.outputs[i] != *output.key {
                        continue;
                    }

                    if ss_data.output_success[i] {
                        return Err(SmartSendError::IncorrectInput.into());
                    }

                    let out_lamports = output.lamports();

                    **output.lamports.borrow_mut() = out_lamports
                        .checked_add(ss_data.output_amounts[i])
                        .ok_or(SmartSendError::Overflow)?;

                    **pda_account.lamports.borrow_mut() = pda_account
                        .lamports()
                        .checked_sub(ss_data.output_amounts[i])
                        .ok_or(SmartSendError::Underflow)?;

                    ss_data.output_success[i] = true;
                    break;
                }

                let outputs_left = ss_data
                    .output_success
                    .clone()
                    .into_iter()
                    .filter(|b| !*b)
                    .count();
                if outputs_left == 0 {
                    ss_data.state = State::Closed;
                } else {
                    msg!("amount left : {:?}", outputs_left);
                }

                ss_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

                Ok(())
            }

            SmartSendInstruction::Debug { buffer_seed } => {
                msg!("Instruction: Debug");
                let accounts_iter = &mut accounts.iter();
                let pda_account = next_account_info(accounts_iter)?;

                let (pda_key, _bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        program_id.as_ref(),
                        &buffer_seed.to_le_bytes(),
                    ],
                    program_id,
                );
                if pda_key != *pda_account.key {
                    return Err(SmartSendError::IncorrectAuthBuff.into());
                }
                let ss_data = SmartSendData::try_from_slice(&pda_account.try_borrow_data()?)?;
                msg!("data: {:?}", ss_data);

                Ok(())
            }
        }
    }
}
