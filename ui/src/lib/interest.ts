import { Connection, PublicKey } from '@solana/web3.js'
import Decimal from 'decimal.js'

import { CLAD_PROGRAM_ID } from '@/constants'
import getAccountData from '@/lib/getAccountData'
import { ExpirableGlobalpoolData } from '@/slices/globalpool'
import { getTickArrayKeyFromTickIndex, getTickArrayOffsetFromTickIndex } from '@/utils'
import { ParsableTickArray } from '@/types/parsing'

interface CalculateInterestParams {
  liquidityBorrowed: number | Decimal
  loanDuration: number, // in seconds
  tickLowerIndex: number
  tickUpperIndex: number
  globalpool: ExpirableGlobalpoolData
  connection: Connection
}

/**
 * Returns prorated interest rate in percentage
 * @param params 
 * @returns 
 */
export async function calculateProratedInterestRate(params: CalculateInterestParams): Promise<Decimal> {
  const {
    tickLowerIndex,
    tickUpperIndex,
    globalpool,
    connection,
    loanDuration,
    liquidityBorrowed: _liquidityBorrowed,
  } = params

  const globalpoolKey = new PublicKey(globalpool._pubkey)
  const { tickSpacing } = globalpool

  const liquidityBorrowed = typeof _liquidityBorrowed === 'number' ? new Decimal(_liquidityBorrowed) : _liquidityBorrowed

  const tickArrayLowerKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tickLowerIndex,
    tickSpacing,
    CLAD_PROGRAM_ID
  )

  const tickArrayUpperKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tickUpperIndex,
    tickSpacing,
    CLAD_PROGRAM_ID
  )

  const tickArrayLower = await getAccountData(tickArrayLowerKey, ParsableTickArray, connection)
  const tickArrayUpper = await getAccountData(tickArrayUpperKey, ParsableTickArray, connection)

  if (!tickArrayLower || !tickArrayUpper) {
    console.error('Could not get tick array data')
    return new Decimal(0)
  }

  const lowerOffset = getTickArrayOffsetFromTickIndex(tickLowerIndex, tickArrayLower.startTickIndex, tickSpacing)
  const upperOffset = getTickArrayOffsetFromTickIndex(tickUpperIndex, tickArrayUpper.startTickIndex, tickSpacing)

  const tickLower = tickArrayLower.ticks[lowerOffset]
  const tickUpper = tickArrayUpper.ticks[upperOffset]

  if (!tickLower || !tickUpper) {
    console.error('Could not get tick data')
    return new Decimal(0)
  }

  const minBps = new Decimal(0.01) // min annual 1%
  // const multiplier = 100 // no need for multiplier in TS as we use `Decimal` to store decimal points

  const tickLowerLiq = new Decimal(tickLower.liquidityGross.toString())
  const tickUpperLiq = new Decimal(tickUpper.liquidityGross.toString())

  const tickLowerUtil = liquidityBorrowed.div(tickLowerLiq)
  const tickUpperUtil = liquidityBorrowed.div(tickUpperLiq)

  let annual = tickLowerUtil.gt(tickUpperUtil) ? tickLowerUtil : tickUpperUtil
  annual = (minBps.gt(annual) ? minBps : annual).mul(100) // scale to percentage

  // console.log(tickLowerUtil.toString(), tickUpperUtil.toString(), annual.toString())
  // console.log(loanDuration, 31_536_000, loanDuration / 31_536_000)
  return annual.mul(loanDuration).div(31_536_000) // doesn't account for leap years
}