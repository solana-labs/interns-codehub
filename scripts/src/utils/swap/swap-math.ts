import BN from 'bn.js'

import { BitMath } from './bit-math'
import { FEE_RATE_MUL_VALUE } from '../../constants'
import {
  getAmountDeltaA,
  getAmountDeltaB,
  getNextSqrtPrice,
} from './token-math'
import { SwapStep } from './types'

export function computeSwapStep(
  amountRemaining: BN,
  feeRate: number,
  currLiquidity: BN,
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
): SwapStep {
  console.log('amountRemaining', amountRemaining.toString())
  console.log('feeRate', feeRate.toString())
  console.log('currLiquidity', currLiquidity.toString())
  console.log('currSqrtPrice', currSqrtPrice.toString())
  console.log('targetSqrtPrice', targetSqrtPrice.toString())
  console.log('amountSpecifiedIsInput', amountSpecifiedIsInput)
  console.log('aToB', aToB)
  let amountFixedDelta = getAmountFixedDelta(
    currSqrtPrice,
    targetSqrtPrice,
    currLiquidity,
    amountSpecifiedIsInput,
    aToB
  )

  let amountCalc = amountRemaining
  if (amountSpecifiedIsInput) {
    const result = BitMath.mulDiv(
      amountRemaining,
      FEE_RATE_MUL_VALUE.sub(new BN(feeRate)),
      FEE_RATE_MUL_VALUE,
      128
    )
    amountCalc = result
  }

  let nextSqrtPrice = amountCalc.gte(amountFixedDelta)
    ? targetSqrtPrice
    : getNextSqrtPrice(
        currSqrtPrice,
        currLiquidity,
        amountCalc,
        amountSpecifiedIsInput,
        aToB
      )

  let isMaxSwap = nextSqrtPrice.eq(targetSqrtPrice)

  let amountUnfixedDelta = getAmountUnfixedDelta(
    currSqrtPrice,
    nextSqrtPrice,
    currLiquidity,
    amountSpecifiedIsInput,
    aToB
  )

  if (!isMaxSwap) {
    amountFixedDelta = getAmountFixedDelta(
      currSqrtPrice,
      nextSqrtPrice,
      currLiquidity,
      amountSpecifiedIsInput,
      aToB
    )
  }

  let amountIn = amountSpecifiedIsInput ? amountFixedDelta : amountUnfixedDelta
  let amountOut = amountSpecifiedIsInput ? amountUnfixedDelta : amountFixedDelta

  if (!amountSpecifiedIsInput && amountOut.gt(amountRemaining)) {
    amountOut = amountRemaining
  }

  let feeAmount: BN
  if (amountSpecifiedIsInput && !isMaxSwap) {
    feeAmount = amountRemaining.sub(amountIn)
  } else {
    const feeRateBN = new BN(feeRate)
    feeAmount = BitMath.mulDivRoundUp(
      amountIn,
      feeRateBN,
      FEE_RATE_MUL_VALUE.sub(feeRateBN),
      128
    )
  }

  return {
    amountIn,
    amountOut,
    nextPrice: nextSqrtPrice,
    feeAmount,
  }
}

function getAmountFixedDelta(
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  currLiquidity: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  if (aToB === amountSpecifiedIsInput) {
    return getAmountDeltaA(
      currSqrtPrice,
      targetSqrtPrice,
      currLiquidity,
      amountSpecifiedIsInput
    )
  } else {
    return getAmountDeltaB(
      currSqrtPrice,
      targetSqrtPrice,
      currLiquidity,
      amountSpecifiedIsInput
    )
  }
}

function getAmountUnfixedDelta(
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  currLiquidity: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  if (aToB === amountSpecifiedIsInput) {
    return getAmountDeltaB(
      currSqrtPrice,
      targetSqrtPrice,
      currLiquidity,
      !amountSpecifiedIsInput
    )
  } else {
    return getAmountDeltaA(
      currSqrtPrice,
      targetSqrtPrice,
      currLiquidity,
      !amountSpecifiedIsInput
    )
  }
}
