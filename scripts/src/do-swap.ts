import { Percentage } from '@orca-so/common-sdk'
import { getMint } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import Decimal from 'decimal.js'

import {
  consoleLogFull,
  getAccountData,
  getTokenBalance,
  truncatedAddress,
} from './utils'
import { ParsableGlobalpool, ParsableTickArray } from './types/parsing'
import { PriceMath, TickUtil } from '@orca-so/whirlpools-sdk'
import { getPostPoolInitParams } from './params'
import { TickArrayData } from './types/accounts'
import { TICK_ARRAY_SIZE } from './constants'
import { getTickArrayKeysForSwap } from './utils/tick-arrays'
import { swapQuoteByInputToken } from './utils/swap'

type TickArrayInfo = {
  tickArrayKey: PublicKey
  startTickIndex: number
  startPrice: Decimal
  endPrice: Decimal
  isCurrent: boolean
  data: TickArrayData | null
}

async function main() {
  const {
    provider,
    programId,
    connection,
    feeRate,
    tickSpacing,
    tokenMintAKey,
    tokenMintBKey,
    cladKey,
    globalpoolKey,
  } = await getPostPoolInitParams()

  console.log(`Clad: ${cladKey.toBase58()}`)
  console.log(`Globalpool: ${globalpoolKey.toBase58()}`)

  const swapA2B = true // swap A to B (SOL to USDC)

  const globalpoolInfo = await getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )
  if (!globalpoolInfo) {
    throw new Error('globalpool not found')
  }

  const mintA = await getMint(connection, globalpoolInfo.tokenMintA)
  const mintB = await getMint(connection, globalpoolInfo.tokenMintB)

  console.log(`Token A: ${mintA.address.toBase58()}`)
  console.log(`Token B: ${mintB.address.toBase58()}`)

  const tickArrayKeys = getTickArrayKeysForSwap(
    globalpoolInfo.tickCurrentIndex,
    tickSpacing,
    swapA2B,
    globalpoolKey,
    programId
  )

  //
  // Log tick array data
  //

  console.log(
    `${swapA2B ? 'A' : 'B'} to ${swapA2B ? 'B' : 'A'} tick array keys`
  )

  for (const tickArrayKey of tickArrayKeys) {
    const tickArrayData = await getAccountData(
      tickArrayKey,
      ParsableTickArray,
      connection
    )
    if (!tickArrayData) {
			console.log(
				tickArrayKey.toBase58().padEnd(16, ' '),
				'  uninit',
			)
			continue
		}

    const { startTickIndex } = tickArrayData
    const endTickIndex =
      tickArrayData.startTickIndex + tickSpacing * TICK_ARRAY_SIZE

    const startPrice = PriceMath.tickIndexToPrice(
      startTickIndex,
      mintA.decimals,
      mintB.decimals
    ).toFixed(mintB.decimals - 4) // denominated in B (price: x B per 1 A)

    const endPrice = PriceMath.tickIndexToPrice(
      endTickIndex,
      mintA.decimals,
      mintB.decimals
    ).toFixed(mintB.decimals - 4) // denominated in B (price: x B per 1 A)

    console.log(
      tickArrayKey.toBase58().padEnd(16, ' '),
      '    init',
			'  start tick',
      startTickIndex.toString().padStart(8, ' '),
      '  range',
      `[${startPrice}, ${endPrice})`.padEnd(22, '')
    )
  }

  //
  // Swap steps
  //

  const quote = await swapQuoteByInputToken(
    globalpoolKey,
    swapA2B ? tokenMintAKey : tokenMintBKey,
    new BN(100000),
    Percentage.fromFraction(1, 100),
    connection,
    programId
  )

  console.log(quote)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
