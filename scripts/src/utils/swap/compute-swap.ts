import { PriceMath } from '@orca-so/whirlpools-sdk'
import BN from 'bn.js'

import { PROTOCOL_FEE_RATE_MUL_VALUE, ZERO_BN } from '../../constants'
import { computeSwapStep } from './swap-math'
import { TickArraySequence } from '../tick-array-sequence'
import { SwapResult } from './types'
import { GlobalpoolData } from '../../types/accounts'

export function computeSwap(
  globalpoolData: GlobalpoolData,
  tickSequence: TickArraySequence,
  tokenAmount: BN,
  sqrtPriceLimit: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
): SwapResult {
  let amountRemaining = tokenAmount
  let amountCalculated = ZERO_BN
  let currSqrtPrice = new BN(globalpoolData.sqrtPrice.toString())
  let currLiquidity = new BN(globalpoolData.liquidityAvailable.toString())
  let currTickIndex = globalpoolData.tickCurrentIndex
  let totalFeeAmount = ZERO_BN
  const feeRate = globalpoolData.feeRate
  const protocolFeeRate = globalpoolData.protocolFeeRate
  let currProtocolFee = ZERO_BN
  let currFeeGrowthGlobalInput = new BN(
    (aToB
      ? globalpoolData.feeGrowthGlobalA
      : globalpoolData.feeGrowthGlobalB
    ).toString()
  )

  while (amountRemaining.gt(ZERO_BN) && !sqrtPriceLimit.eq(currSqrtPrice)) {
    let { nextIndex: nextTickIndex } =
      tickSequence.findNextInitializedTickIndex(currTickIndex)

    let { nextTickPrice, nextSqrtPriceLimit: targetSqrtPrice } =
      getNextSqrtPrices(nextTickIndex, sqrtPriceLimit, aToB)

    const swapComputation = computeSwapStep(
      amountRemaining,
      feeRate,
      currLiquidity,
      currSqrtPrice,
      targetSqrtPrice,
      amountSpecifiedIsInput,
      aToB
    )

    totalFeeAmount = totalFeeAmount.add(swapComputation.feeAmount)

    if (amountSpecifiedIsInput) {
      amountRemaining = amountRemaining.sub(swapComputation.amountIn)
      amountRemaining = amountRemaining.sub(swapComputation.feeAmount)
      amountCalculated = amountCalculated.add(swapComputation.amountOut)
    } else {
      amountRemaining = amountRemaining.sub(swapComputation.amountOut)
      amountCalculated = amountCalculated.add(swapComputation.amountIn)
      amountCalculated = amountCalculated.add(swapComputation.feeAmount)
    }

    let { nextProtocolFee, nextFeeGrowthGlobalInput } = calculateFees(
      swapComputation.feeAmount,
      protocolFeeRate,
      currLiquidity,
      currProtocolFee,
      currFeeGrowthGlobalInput
    )
    currProtocolFee = nextProtocolFee
    currFeeGrowthGlobalInput = nextFeeGrowthGlobalInput

    if (swapComputation.nextPrice.eq(nextTickPrice)) {
      const nextTick = tickSequence.getTick(nextTickIndex)
      if (nextTick.initialized) {
        currLiquidity = calculateNextLiquidity(
          nextTick.liquidityNet,
          currLiquidity,
          aToB
        )
      }
      currTickIndex = aToB ? nextTickIndex - 1 : nextTickIndex
    } else {
      currTickIndex = PriceMath.sqrtPriceX64ToTickIndex(
        swapComputation.nextPrice
      )
    }

    currSqrtPrice = swapComputation.nextPrice
  }

  let { amountA, amountB } = calculateEstTokens(
    tokenAmount,
    amountRemaining,
    amountCalculated,
    aToB,
    amountSpecifiedIsInput
  )

  return {
    amountA,
    amountB,
    nextTickIndex: currTickIndex,
    nextSqrtPrice: currSqrtPrice,
    totalFeeAmount,
  }
}

function getNextSqrtPrices(
  nextTick: number,
  sqrtPriceLimit: BN,
  aToB: boolean
) {
  const nextTickPrice = PriceMath.tickIndexToSqrtPriceX64(nextTick)
  const nextSqrtPriceLimit = aToB
    ? BN.max(sqrtPriceLimit, nextTickPrice)
    : BN.min(sqrtPriceLimit, nextTickPrice)
  return { nextTickPrice, nextSqrtPriceLimit }
}

function calculateFees(
  feeAmount: BN,
  protocolFeeRate: number,
  currLiquidity: BN,
  currProtocolFee: BN,
  currFeeGrowthGlobalInput: BN
) {
  let nextProtocolFee = currProtocolFee
  let nextFeeGrowthGlobalInput = currFeeGrowthGlobalInput
  let globalFee = feeAmount

  if (protocolFeeRate > 0) {
    let delta = calculateProtocolFee(globalFee, protocolFeeRate)
    globalFee = globalFee.sub(delta)
    nextProtocolFee = nextProtocolFee.add(currProtocolFee)
  }

  if (currLiquidity.gt(ZERO_BN)) {
    const globalFeeIncrement = globalFee.shln(64).div(currLiquidity)
    nextFeeGrowthGlobalInput = nextFeeGrowthGlobalInput.add(globalFeeIncrement)
  }

  return {
    nextProtocolFee,
    nextFeeGrowthGlobalInput,
  }
}

function calculateProtocolFee(globalFee: BN, protocolFeeRate: number) {
  return globalFee.mul(new BN(protocolFeeRate).div(PROTOCOL_FEE_RATE_MUL_VALUE))
}

function calculateEstTokens(
  amount: BN,
  amountRemaining: BN,
  amountCalculated: BN,
  aToB: boolean,
  amountSpecifiedIsInput: boolean
) {
  return aToB === amountSpecifiedIsInput
    ? {
        amountA: amount.sub(amountRemaining),
        amountB: amountCalculated,
      }
    : {
        amountA: amountCalculated,
        amountB: amount.sub(amountRemaining),
      }
}

function calculateNextLiquidity(
  tickNetLiquidity: BN,
  currLiquidity: BN,
  aToB: boolean
) {
  return aToB
    ? currLiquidity.sub(tickNetLiquidity)
    : currLiquidity.add(tickNetLiquidity)
}
