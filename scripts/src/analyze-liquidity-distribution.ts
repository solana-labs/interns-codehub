import { PublicKey } from '@solana/web3.js'
import { PriceMath, TickUtil } from '@orca-so/whirlpools-sdk'
import BN from 'bn.js'

import { TICK_ARRAY_SIZE } from './constants'
import { getPostPoolInitParams } from './params'
import { ParsableGlobalpool, ParsableTickArray } from './types/parsing'
import { getAccountData } from './utils'

async function main() {
  const {
    connection,
    tickSpacing,
    globalpoolKey,
    tokenMintA,
    tokenMintB,
    programId,
  } = await getPostPoolInitParams()

  const globalpoolData = await getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )
  if (!globalpoolData) {
    throw new Error('globalpool not found')
  }

  const { tickCurrentIndex } = globalpoolData

  // get tickArray pubkeys
  // -3 to +3 tickarrays
  const TICKARRAY_LOWER_OFFSET = -1
  const TICKARRAY_UPPER_OFFSET = +1
  const tickArrayStartIndexes: number[] = []
  const tickArrayKeys: PublicKey[] = []

  for (
    let offset = TICKARRAY_LOWER_OFFSET;
    offset <= TICKARRAY_UPPER_OFFSET;
    offset++
  ) {
    const startTickIndex = TickUtil.getStartTickIndex(
      tickCurrentIndex,
      tickSpacing,
      offset
    )

    const [tickArrayKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('tick_array'),
        globalpoolKey.toBuffer(),
        Buffer.from(startTickIndex.toString()),
      ],
      programId
    )

    tickArrayStartIndexes.push(startTickIndex)
    tickArrayKeys.push(tickArrayKey)
  }

  // get tickarrays
  const tickArrays = await Promise.all(
    tickArrayKeys.map(async (tickArrayKey) => {
      const tickArrayData = await getAccountData(
        tickArrayKey,
        ParsableTickArray,
        connection
      )
      console.log(tickArrayKey)
      if (!tickArrayData) {
        throw new Error('tickArray not found')
      }
      return tickArrayData
    })
  )

  // sweep liquidity
  const currentInitializableTickIndex =
    Math.floor(tickCurrentIndex / tickSpacing) * tickSpacing
  const currentPoolLiquidity = new BN(
    globalpoolData.liquidityAvailable.toString()
  )
  const liquidityDistribution = []
  let liquidity = new BN(0)
  let liquidity_difference = new BN(0)

  for (let ta = 0; ta < tickArrays.length; ta++) {
    const tickArray = tickArrays[ta]

    for (let i = 0; i < TICK_ARRAY_SIZE; i++) {
      const tickIndex = tickArrayStartIndexes[ta] + i * tickSpacing

      // move right (add liquidityNet)
      liquidity =
        tickArray == null
          ? liquidity
          : liquidity.add(tickArray.ticks[i].liquidityNet)

      liquidityDistribution.push({ tickIndex, liquidity })

      // liquidity in tickArray not read
      if (tickIndex === currentInitializableTickIndex) {
        liquidity_difference = currentPoolLiquidity.sub(liquidity)
      }
    }
  }

  // adjust (liquidity in tickArray not read)
  for (let i = 0; i < liquidityDistribution.length; i++) {
    liquidityDistribution[i].liquidity =
      liquidityDistribution[i].liquidity.add(liquidity_difference)
  }

  // print liquidity distribution
  for (let i = 0; i < liquidityDistribution.length; i++) {
    const ld = liquidityDistribution[i]
    console.log(
      'tickIndex:',
      ld.tickIndex.toString().padStart(6, ' '),
      '/ price:',
      PriceMath.tickIndexToPrice(
        ld.tickIndex,
        tokenMintA.decimals,
        tokenMintB.decimals
      )
        .toFixed(tokenMintB.decimals - 4)
        .toString()
        .padStart(11, ' '),
      '/ liquidity:',
      ld.liquidity.toString().padStart(20, ' '), // ld.liquidity.shrn(64)
      ld.tickIndex === currentInitializableTickIndex ? ' <== CURRENT' : ''
    )
  }

  console.log('current pool liquidity:', currentPoolLiquidity.toString())
  console.log('current index:', tickCurrentIndex)
  console.log(
    'current initializable tick index:',
    currentInitializableTickIndex
  )
  console.log(
    'liquidity difference (liquidity in tickArray not read):',
    liquidity_difference.toString()
  )
}

main()
