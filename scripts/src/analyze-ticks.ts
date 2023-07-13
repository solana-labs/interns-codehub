import { getMint } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
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

  const neighboringTickArrayInfos: TickArrayInfo[] = []
  for (let offset = -6; offset <= +6; offset++) {
    const startTickIndex = TickUtil.getStartTickIndex(
      globalpoolInfo.tickCurrentIndex,
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
    //  PDAUtil.getTickArray(programId, whirlpoolPubkey, startTickIndex);

    const endTickIndex = startTickIndex + tickSpacing * TICK_ARRAY_SIZE

    const startPrice = PriceMath.tickIndexToPrice(
      startTickIndex,
      mintA.decimals,
      mintB.decimals
    )

    const endPrice = PriceMath.tickIndexToPrice(
      endTickIndex,
      mintA.decimals,
      mintB.decimals
    )

    const tickArrayData = await getAccountData(
      tickArrayKey,
      ParsableTickArray,
      connection
    )

    neighboringTickArrayInfos.push({
      tickArrayKey,
      startTickIndex,
      startPrice,
      endPrice,
      isCurrent: offset == 0,
      data: tickArrayData,
    })
  }

  console.log('neighboring tickarrays...')

  for (const ta of neighboringTickArrayInfos) {
    const priceRange = [
      ta.startPrice.toFixed(mintB.decimals - 4),
      ta.endPrice.toFixed(mintB.decimals - 4),
    ]
    console.log(
      ta.isCurrent ? '>>' : ' '.repeat(2),
      truncatedAddress(ta.tickArrayKey.toBase58()).padEnd(16, ' '),
      ta.data ? '(init)' : ' '.repeat(6),
      '  start tick',
      ta.startTickIndex.toString().padStart(8, ' '),
      '  range',
      `[${priceRange[0]}, ${priceRange[1]})`.padEnd(22, '')
    )

    if (!ta.data) continue

    const { ticks } = ta.data
    for (let i = 0; i < ticks.length; i++) {
      const tick = ticks[i]
      if (!tick.initialized) continue

      // const liquidityNet = PriceMath.sqrtPriceX64ToPrice(tick.liquidityBorrowed)
      console.log(
        ' '.repeat(4),
        `tick ${String(i).padEnd(2, ' ')}  `,
        `net:      ${tick.liquidityNet.toLocaleString().padStart(30, ' ')}  `
      )
      console.log(
        ' '.repeat(14),
        `gross:    ${tick.liquidityGross.toLocaleString().padStart(30, ' ')}  `
      )
      console.log(
        ' '.repeat(14),
        `borrowed: ${tick.liquidityBorrowed
          .toLocaleString()
          .padStart(30, ' ')}  `
      )
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
