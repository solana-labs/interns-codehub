import { PublicKey } from '@solana/web3.js'

import { MAX_SWAP_TICK_ARRAYS} from '../constants'
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
