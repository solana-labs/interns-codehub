import { Percentage, U64_MAX } from '@orca-so/common-sdk'
import BN from 'bn.js'

import { BitMath } from './bit-math'
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE, ZERO_BN } from '../../constants'

export function getAmountDeltaA(
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  currLiquidity: BN,
  roundUp: boolean
): BN {
  let [sqrtPriceLower, sqrtPriceUpper] = toIncreasingPriceOrder(
    currSqrtPrice,
    targetSqrtPrice
  )
  let sqrtPriceDiff = sqrtPriceUpper.sub(sqrtPriceLower)
  // console.log('sqrtPriceLower', sqrtPriceLower.toString())
  // console.log('sqrtPriceUpper', sqrtPriceUpper.toString())
  // console.log('sqrtPriceDiff', sqrtPriceDiff.toString())

  let numerator = currLiquidity.mul(sqrtPriceDiff).shln(64)
  let denominator = sqrtPriceLower.mul(sqrtPriceUpper)
  // console.log('numerator', numerator.toString())
  // console.log('denominator', denominator.toString())

  let quotient = numerator.div(denominator)
  let remainder = numerator.mod(denominator)
  // console.log('quotient', quotient.toString())
  // console.log('remainder', remainder.toString())

  let result =
    roundUp && !remainder.eq(ZERO_BN) ? quotient.add(new BN(1)) : quotient
  // console.log('result', result.toString())

  if (result.gt(U64_MAX)) {
    throw new Error('Results larger than U64')
  }

  return result
}

export function getAmountDeltaB(
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  currLiquidity: BN,
  roundUp: boolean
): BN {
  let [sqrtPriceLower, sqrtPriceUpper] = toIncreasingPriceOrder(
    currSqrtPrice,
    targetSqrtPrice
  )
  let sqrtPriceDiff = sqrtPriceUpper.sub(sqrtPriceLower)
  return BitMath.checked_mul_shift_right_round_up_if(
    currLiquidity,
    sqrtPriceDiff,
    roundUp,
    128
  )
}

export function getNextSqrtPrice(
  sqrtPrice: BN,
  currLiquidity: BN,
  amount: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  if (amountSpecifiedIsInput === aToB) {
    return getNextSqrtPriceFromARoundUp(
      sqrtPrice,
      currLiquidity,
      amount,
      amountSpecifiedIsInput
    )
  } else {
    return getNextSqrtPriceFromBRoundDown(
      sqrtPrice,
      currLiquidity,
      amount,
      amountSpecifiedIsInput
    )
  }
}

export function adjustForSlippage(
  n: BN,
  { numerator, denominator }: Percentage,
  adjustUp: boolean
): BN {
  if (adjustUp) {
    return n.mul(denominator.add(numerator)).div(denominator)
  } else {
    return n.mul(denominator).div(denominator.add(numerator))
  }
}

function toIncreasingPriceOrder(sqrtPrice0: BN, sqrtPrice1: BN) {
  if (sqrtPrice0.gt(sqrtPrice1)) {
    return [sqrtPrice1, sqrtPrice0]
  } else {
    return [sqrtPrice0, sqrtPrice1]
  }
}

function getNextSqrtPriceFromARoundUp(
  sqrtPrice: BN,
  currLiquidity: BN,
  amount: BN,
  amountSpecifiedIsInput: boolean
) {
  if (amount.eq(ZERO_BN)) {
    return sqrtPrice
  }

  let p = BitMath.mul(sqrtPrice, amount, 256)
  let numerator = BitMath.mul(currLiquidity, sqrtPrice, 256).shln(64)
  if (BitMath.isOverLimit(numerator, 256)) {
    throw new Error('getNextSqrtPriceFromARoundUp - numerator overflow u256')
  }

  let currLiquidityShiftLeft = currLiquidity.shln(64)
  if (!amountSpecifiedIsInput && currLiquidityShiftLeft.lte(p)) {
    throw new Error(
      'getNextSqrtPriceFromARoundUp - Unable to divide currLiquidityX64 by product'
    )
  }

  let denominator = amountSpecifiedIsInput
    ? currLiquidityShiftLeft.add(p)
    : currLiquidityShiftLeft.sub(p)

  let price = BitMath.divRoundUp(numerator, denominator)

  if (price.lt(new BN(MIN_SQRT_PRICE))) {
    throw new Error(
      'getNextSqrtPriceFromARoundUp - price less than min sqrt price'
    )
  } else if (price.gt(new BN(MAX_SQRT_PRICE))) {
    throw new Error(
      'getNextSqrtPriceFromARoundUp - price less than max sqrt price'
    )
  }

  return price
}

function getNextSqrtPriceFromBRoundDown(
  sqrtPrice: BN,
  currLiquidity: BN,
  amount: BN,
  amountSpecifiedIsInput: boolean
) {
  let amountX64 = amount.shln(64)

  let delta = BitMath.divRoundUpIf(
    amountX64,
    currLiquidity,
    !amountSpecifiedIsInput
  )

  if (amountSpecifiedIsInput) {
    sqrtPrice = sqrtPrice.add(delta)
  } else {
    sqrtPrice = sqrtPrice.sub(delta)
  }

  return sqrtPrice
}
