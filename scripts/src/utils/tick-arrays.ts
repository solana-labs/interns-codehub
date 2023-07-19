import * as anchor from '@coral-xyz/anchor'
import { TransactionBuilder } from '@orca-so/common-sdk'
import { PublicKey, SystemProgram } from '@solana/web3.js'

import { Clad, MAX_SWAP_TICK_ARRAYS, TICK_ARRAY_SIZE } from '../constants'
import { InitTickArrayParams } from '../types/instructions'
import { ParsableTickArray } from '../types/parsing'
import { getAccountData } from '../utils'
import { TickUtil } from '@orca-so/whirlpools-sdk'

/**
 * Get TickArray key from valid start tick index
 * 
 * @param globalpool 
 * @param startTickIndex 
 * @param programId 
 * @returns 
 */
export function getTickArrayKey(
  globalpool: PublicKey,
  startTickIndex: number,
  programId: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('tick_array'),
      globalpool.toBuffer(),
      Buffer.from(startTickIndex.toString()),
    ],
    programId
  )[0]
}

/**
 * Get TickArray key from any valid tick index, which doesn't have to be a start index.
 * 
 * @param globalpool 
 * @param rawTickIndex Any valid tick index
 * @param tickSpacing 
 * @param programId 
 * @returns 
 */
export function getTickArrayKeyFromTickIndex(
  globalpool: PublicKey,
  rawTickIndex: number,
  tickSpacing: number,
  programId: PublicKey
) {
  const startTickIndex = TickUtil.getStartTickIndex(rawTickIndex, tickSpacing)
  return getTickArrayKey(globalpool, startTickIndex, programId)
}

export async function initTickArray(
  globalpool: PublicKey,
  startTickIndex: number,
  program: anchor.Program<Clad>,
  provider: anchor.AnchorProvider
  // funder?: Keypair,
): Promise<{ txId: string; params: InitTickArrayParams }> {
  const tickArrayKey = getTickArrayKey(
    globalpool,
    startTickIndex,
    program.programId
  )

  const initializeTickArrayParams = {
    startTickIndex,
  }
  const initializeTickArrayAccounts = {
    funder: provider.wallet.publicKey,
    globalpool,
    tickArray: tickArrayKey,
    systemProgram: SystemProgram.programId,
  }

  const tx = new TransactionBuilder(
    provider.connection,
    provider.wallet
  ).addInstruction({
    instructions: [
      program.instruction.initializeTickArray(initializeTickArrayParams, {
        accounts: initializeTickArrayAccounts,
      }),
    ],
    cleanupInstructions: [],
    signers: [],
  })
  // if (funder) tx.addSigner(funder);

  return {
    txId: await tx.buildAndExecute(),
    params: { globalpool, tickArray: tickArrayKey, startTick: startTickIndex },
  }
}

export async function initTickArrayRange(
  globalpool: PublicKey,
  startTickIndex: number,
  arrayCount: number,
  tickSpacing: number,
  aToB: boolean,
  program: anchor.Program<Clad>,
  provider: anchor.AnchorProvider
): Promise<PublicKey[]> {
  const ticksInArray = tickSpacing * TICK_ARRAY_SIZE
  const direction = aToB ? -1 : 1

  return Promise.all(
    [...Array(arrayCount).keys()].map(async (i) => {
      try {
        const tickArrayKey = getTickArrayKey(
          globalpool,
          startTickIndex,
          program.programId
        )

        const initializedTickArray = await getAccountData(
          tickArrayKey,
          ParsableTickArray,
          provider.connection
        )

        if (initializedTickArray) return tickArrayKey

        const { params } = await initTickArray(
          globalpool,
          startTickIndex + direction * ticksInArray * i,
          program,
          provider
        )

        console.log(
          'Init TickArray from tick index: ',
          startTickIndex + direction * ticksInArray * i,
          ` \t ${params.tickArray}`
        )

        return params.tickArray
      } catch (err) {
        throw err
      }
    })
  )
}

export function getTickArrayKeysForSwap(
  tickCurrentIndex: number,
  tickSpacing: number,
  aToB: boolean,
  globalpool: PublicKey,
  programId: PublicKey
) {
  const tickArrayKeys: PublicKey[] = []
  let offset = 0

  // console.log('aToB: ', aToB)
  for (let i = 0; i < MAX_SWAP_TICK_ARRAYS; i++) {
    let startIndex: number
    try {
      const shift = aToB ? 0 : tickSpacing // A to B is inclusive of lower tick,
      startIndex = TickUtil.getStartTickIndex(
        tickCurrentIndex + shift,
        tickSpacing,
        offset
      )
      // console.log('find: ', tickCurrentIndex + shift)
      // console.log('offset: ', offset)
      // console.log('>> found: ', startIndex)
    } catch {
      return tickArrayKeys
    }

    const tickArrayKey = getTickArrayKey(globalpool, startIndex, programId)
    tickArrayKeys.push(tickArrayKey)
    offset = aToB ? offset - 1 : offset + 1
  }

  return tickArrayKeys
}
