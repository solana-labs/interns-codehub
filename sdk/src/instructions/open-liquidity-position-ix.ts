import * as anchor from '@coral-xyz/anchor'
import { Instruction } from '@orca-so/common-sdk'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { PublicKey, SystemProgram } from '@solana/web3.js'

import { Clad } from '@/target/types/clad'

/**
 * Parameters to open a position in a Whirlpool.
 *
 * @category Instruction Types
 * @param whirlpool - PublicKey for the whirlpool that the position will be opened for.
 * @param ownerKey - PublicKey for the wallet that will host the minted position token.
 * @param position - PublicKey for the derived position address.
 * @param positionMintAddress - PublicKey for the mint token for the Position token.
 * @param positionTokenAccount - The associated token address for the position token in the owners wallet.
 * @param tickLowerIndex - The tick specifying the lower end of the position range.
 * @param tickUpperIndex - The tick specifying the upper end of the position range.
 * @param funder - The account that would fund the creation of this account
 */

export type OpenLiquidityPositionParams = {
  tickLowerIndex: number
  tickUpperIndex: number
}

export type OpenLiquidityPositionAccounts = {
  positionAuthority: PublicKey
  globalpool: PublicKey
  position: PublicKey
  positionMint: PublicKey
  positionTokenAccount: PublicKey
}

/**
 * Open a position in a Whirlpool. A unique token will be minted to represent the position in the users wallet.
 * The position will start off with 0 liquidity.
 *
 * #### Special Errors
 * `InvalidTickIndex` - If a provided tick is out of bounds, out of order or not a multiple of the tick-spacing in this pool.
 *
 * @category Instructions
 * @param context - Context object containing services required to generate the instruction
 * @param params - OpenPositionParams object
 * @returns - Instruction to perform the action.
 */
export function openLiquidityPositionIx(
  program: anchor.Program<Clad>,
  accounts: OpenLiquidityPositionAccounts,
  params: OpenLiquidityPositionParams
): Instruction {
  const ix = program.instruction.openLiquidityPosition(params, {
    accounts: {
      ...accounts,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
  })

  return {
    instructions: [ix],
    cleanupInstructions: [],
    signers: [],
  }
}
