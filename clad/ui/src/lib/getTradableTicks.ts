import { PriceMath, TickUtil } from '@orca-so/whirlpools-sdk'
import { Connection, PublicKey } from '@solana/web3.js'
import Decimal from 'decimal.js'

import { CLAD_PROGRAM_ID, TICK_ARRAY_SIZE } from '@/constants'
import { getAccountData } from '@/lib'
import { ExpirableGlobalpoolData } from '@/slices/globalpool'
import { TickArrayData, TickData } from '@/types/accounts'
import { ParsableTickArray } from '@/types/parsing'
import { getTickArrayKey, truncatedAddress } from '@/utils'
import { Token } from '@solflare-wallet/utl-sdk'

export type TickArrayInfo = {
  tickArrayKey: PublicKey
  startTickIndex: number
  startPrice: Decimal
  endPrice: Decimal
  isCurrent: boolean
  data: TickArrayData | null
}

export type TradableTick = TickData & {
  tickIndex: number
}

export type GetTradableTicksParams = {
  globalpool: ExpirableGlobalpoolData
  connection: Connection
  baseToken: Token
  quoteToken: Token
  offset?: number
}

export async function getTradableTicks(params: GetTradableTicksParams) {
  const {
    globalpool,
    connection,
    baseToken,
    quoteToken,
  } = params
  const offset = params.offset || 4

  const { tickCurrentIndex, tickSpacing } = globalpool
  const globalpoolKey = new PublicKey(globalpool._pubkey)

  const baseDecimals = baseToken.decimals || 9
  const quoteDecimals = quoteToken.decimals || 9

  const tradableTicks: TradableTick[] = []
  const neighboringTickArrayInfos: TickArrayInfo[] = []

  for (let i = -offset; i <= +offset; i++) {
    const startTickIndex = TickUtil.getStartTickIndex(
      tickCurrentIndex,
      tickSpacing,
      i
    )

    const tickArrayKey = getTickArrayKey(
      globalpoolKey,
      startTickIndex,
      CLAD_PROGRAM_ID
    )
    //  PDAUtil.getTickArray(CLAD_PROGRAM_ID, whirlpoolPubkey, startTickIndex);

    const endTickIndex = startTickIndex + tickSpacing * TICK_ARRAY_SIZE

    const startPrice = PriceMath.tickIndexToPrice(
      startTickIndex,
      baseDecimals,
      quoteDecimals
    )

    const endPrice = PriceMath.tickIndexToPrice(
      endTickIndex,
      baseDecimals,
      quoteDecimals
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
      isCurrent: i == 0,
      data: tickArrayData,
    })
  }

  for (const tickArray of neighboringTickArrayInfos) {
    if (!tickArray.data) continue

    const { ticks } = tickArray.data

    const thisArrayTradableTicks = ticks.map((tick, i) => {
      if (!tick || !tick.initialized || (tick.liquidityGross.isZero() && tick.liquidityBorrowed.isZero())) return null
      return {
        tickIndex: tickArray.startTickIndex + i * tickSpacing,
        ...tick,
      } as TradableTick
    }).filter((x) => !!x) as TradableTick[]

    tradableTicks.push(...thisArrayTradableTicks)
  }

  return tradableTicks
}