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
import { getTickArrayKey } from './utils/tick-arrays'

type TickArrayInfo = {
  tickArrayKey: PublicKey
  startTickIndex: number
  startPrice: Decimal
  endPrice: Decimal
  isCurrent: boolean
  data: TickArrayData | null
}

async function main() {
  const { programId, connection, tickSpacing, cladKey, globalpoolKey } =
    await getPostPoolInitParams()

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

    const tickArrayKey = getTickArrayKey(
      globalpoolKey,
      startTickIndex,
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
      let [zeroNet, zeroGross, zeroBorrowed] = [
        tick.liquidityNet,
        tick.liquidityGross,
        tick.liquidityBorrowed,
      ].map((x) => x.isZero())
      let isZero = zeroNet && zeroGross && zeroBorrowed

      // const liquidityNet = tick.liquidityNet.ishrn(64) // from X64
      // const liquidityGross = tick.liquidityGross.ushrn(64) // from X64
      const liquidityNet = tick.liquidityNet
      const liquidityGross = tick.liquidityGross

      if (!isZero) {
        console.log(
          `tick ${ta.startTickIndex + i * tickSpacing} (offset: ${i})`
        )
      }

      if (tick.initialized) {
        console.log(' '.repeat(4), 'initialized')
      }

      // const liquidityNet = PriceMath.sqrtPriceX64ToPrice(tick.liquidityBorrowed)
      if (!zeroNet) {
        console.log(
          ' '.repeat(4),
          `net:      ${liquidityNet.toLocaleString().padStart(30, ' ')}  `
        )
      }

      if (!zeroGross) {
        console.log(
          ' '.repeat(4),
          `gross:    ${liquidityGross.toLocaleString().padStart(30, ' ')}  `
        )
      }

      if (!zeroBorrowed) {
        console.log(
          ' '.repeat(4),
          `borrowed: ${tick.liquidityBorrowed
            .toLocaleString()
            .padStart(30, ' ')}  `
        )
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
