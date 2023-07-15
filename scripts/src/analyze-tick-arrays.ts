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

// interface TickData {
//   initialized: boolean
//   liquidity_net: bigint
//   liquidity_gross: bigint
//   liquidity_borrowed: bigint
//   feeGrowth_outside_a: bigint
//   feeGrowth_outside_b: bigint
// }

// interface TickArrayData {
//   globalpool: PublicKey
//   start_tick_index: number
//   ticks: TickData[]
// }

// class TickDataStruct implements TickData {
//   initialized: boolean
//   liquidity_net: bigint
//   liquidity_gross: bigint
//   liquidity_borrowed: bigint
//   feeGrowth_outside_a: bigint
//   feeGrowth_outside_b: bigint
//   constructor(fields: TickData) {
//     this.initialized = fields.initialized
//     this.liquidity_net = fields.liquidity_net
//     this.liquidity_gross = fields.liquidity_gross
//     this.liquidity_borrowed = fields.liquidity_borrowed
//     this.feeGrowth_outside_a = fields.feeGrowth_outside_a
//     this.feeGrowth_outside_b = fields.feeGrowth_outside_b
//   }
// }

// class TickArrayDataStruct implements TickArrayData {
//   globalpool: PublicKey
//   start_tick_index: number
//   ticks: TickData[]
//   constructor(fields: TickArrayData) {
//     this.globalpool = fields.globalpool
//     this.start_tick_index = fields.start_tick_index
//     this.ticks = fields.ticks
//   }
// }

// const TickArrayDataSchema = new Map<any, any>([
//   [
//     TickArrayDataStruct,
//     {
//       kind: 'struct',
//       fields: [
//         ['globalpool', [32]],
//         ['start_tick_index', 'i32'],
//         ['ticks', [TickDataStruct]],
//       ],
//     },
//   ],
//   [
//     TickDataStruct,
//     {
//       kind: 'struct',
//       fields: [
//         ['initialized', 'bool'],
//         ['liquidity_net', 'i128'],
//         ['liquidity_gross', 'u128'],
//         ['liquidity_borrowed', 'i128'],
//         ['feeGrowth_outside_a', 'u128'],
//         ['feeGrowth_outside_b', 'u128'],
//       ],
//     },
//   ],
// ])

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

    const tickArrayRaw = await connection.getAccountInfo(tickArrayKey)
    if (!tickArrayRaw) {
      continue
    }

    const tickArrayData = await getAccountData(
      tickArrayKey,
      ParsableTickArray,
      connection
    )

    //
    // Manual deserialization because of i128
    //

    // const tickArrayData = borsh.deserialize(TickArrayDataSchema, TickArrayDataStruct, tickArrayRaw.data)

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
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
