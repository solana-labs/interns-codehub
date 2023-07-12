import { BN, Program } from '@coral-xyz/anchor'
import { Instruction, PDA } from '@orca-so/common-sdk'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js'

import { Clad } from '@/target/types/clad'

/**
 * Parameters to initialize a Whirlpool account.
 *
 * @category Instruction Types
 * @param initSqrtPrice - The desired initial sqrt-price for this pool
 * @param whirlpoolsConfig - The public key for the WhirlpoolsConfig this pool is initialized in
 * @param whirlpoolPda - PDA for the whirlpool account that would be initialized
 * @param tokenMintA - Mint public key for token A
 * @param tokenMintB - Mint public key for token B
 * @param tokenVaultAKeypair - Keypair of the token A vault for this pool
 * @param tokenVaultBKeypair - Keypair of the token B vault for this pool
 * @param feeTierKey - PublicKey of the fee-tier account that this pool would use for the fee-rate
 * @param tickSpacing - The desired tick spacing for this pool.
 * @param funder - The account that would fund the creation of this account
 */
export type CreatePoolParams = {
  feeRate: number
  tickSpacing: number
  initialSqrtPrice: BN
}

export type CreatePoolAccounts = {
  funder: PublicKey
  clad: PublicKey
  globalpool: PublicKey
  tokenMintA: PublicKey
  tokenMintB: PublicKey
  tokenVaultAKeypair: Keypair
  tokenVaultBKeypair: Keypair
}

export function createPoolIx(
  program: Program<Clad>,
  accounts: CreatePoolAccounts,
  params: CreatePoolParams
): Instruction {
  const { tokenVaultAKeypair, tokenVaultBKeypair, ...rest } = accounts

  const ix = program.instruction.createPool(params, {
    accounts: {
      ...rest,
      tokenVaultA: tokenVaultAKeypair.publicKey,
      tokenVaultB: tokenVaultBKeypair.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    },
  })

  return {
    instructions: [ix],
    cleanupInstructions: [],
    signers: [tokenVaultAKeypair, tokenVaultBKeypair],
  }
}
