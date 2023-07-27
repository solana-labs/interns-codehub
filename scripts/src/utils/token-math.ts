import { MathUtil } from '@orca-so/common-sdk'
import { PriceMath } from '@orca-so/whirlpools-sdk'
import BN from 'bn.js'
import Decimal from 'decimal.js'

export type TokenAmounts = {
  tokenA: BN
  tokenB: BN
}

// https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/pool-utils.ts#L78
export function getTokenAmountsFromLiquidity(
  liquidity: BN,
  currentSqrtPrice: BN,
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  round_up: boolean
): TokenAmounts {
  const _liquidity = new Decimal(liquidity.toString())
  const _currentPrice = new Decimal(currentSqrtPrice.toString())
  const _lowerPrice = new Decimal(lowerSqrtPrice.toString())
  const _upperPrice = new Decimal(upperSqrtPrice.toString())
  let tokenA, tokenB
  if (currentSqrtPrice.lt(lowerSqrtPrice)) {
    // x = L * (pb - pa) / (pa * pb)
    tokenA = MathUtil.toX64_Decimal(_liquidity)
      .mul(_upperPrice.sub(_lowerPrice))
      .div(_lowerPrice.mul(_upperPrice))
    tokenB = new Decimal(0)
  } else if (currentSqrtPrice.lt(upperSqrtPrice)) {
    // x = L * (pb - p) / (p * pb)
    // y = L * (p - pa)
    tokenA = MathUtil.toX64_Decimal(_liquidity)
      .mul(_upperPrice.sub(_currentPrice))
      .div(_currentPrice.mul(_upperPrice))
    tokenB = MathUtil.fromX64_Decimal(
      _liquidity.mul(_currentPrice.sub(_lowerPrice))
    )
  } else {
    // y = L * (pb - pa)
    tokenA = new Decimal(0)
    tokenB = MathUtil.fromX64_Decimal(
      _liquidity.mul(_upperPrice.sub(_lowerPrice))
    )
  }

  // TODO: round up
  if (round_up) {
    return {
      tokenA: new BN(tokenA.ceil().toString()),
      tokenB: new BN(tokenB.ceil().toString()),
    }
  } else {
    return {
      tokenA: new BN(tokenA.floor().toString()),
      tokenB: new BN(tokenB.floor().toString()),
    }
  }
}

// https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/pool-utils.ts#L135
export function estimateLiquidityFromTokenAmounts(
  currTick: number,
  lowerTick: number,
  upperTick: number,
  tokenAmount: TokenAmounts
) {
  if (upperTick < lowerTick) {
    throw new Error('upper tick cannot be lower than the lower tick')
  }

  const currSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(currTick)
  const lowerSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(lowerTick)
  const upperSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(upperTick)

  if (currTick >= upperTick) {
    return estimateLiquidityForTokenB(
      upperSqrtPrice,
      lowerSqrtPrice,
      tokenAmount.tokenB
    )
  } else if (currTick < lowerTick) {
    return estimateLiquidityForTokenA(
      lowerSqrtPrice,
      upperSqrtPrice,
      tokenAmount.tokenA
    )
  } else {
    const estLiquidityAmountA = estimateLiquidityForTokenA(
      currSqrtPrice,
      upperSqrtPrice,
      tokenAmount.tokenA
    )
    const estLiquidityAmountB = estimateLiquidityForTokenB(
      currSqrtPrice,
      lowerSqrtPrice,
      tokenAmount.tokenB
    )
    return BN.min(estLiquidityAmountA, estLiquidityAmountB)
  }
}

export function estimateLiquidityForTokenA(
  sqrtPrice1: BN,
  sqrtPrice2: BN,
  tokenAmount: BN
) {
  const lowerSqrtPriceX64 = BN.min(sqrtPrice1, sqrtPrice2)
  const upperSqrtPriceX64 = BN.max(sqrtPrice1, sqrtPrice2)

  const num = MathUtil.fromX64_BN(
    tokenAmount.mul(upperSqrtPriceX64).mul(lowerSqrtPriceX64)
  )
  const dem = upperSqrtPriceX64.sub(lowerSqrtPriceX64)

  return num.div(dem)
}

// Convert this function based on Delta B = Delta L * (sqrt_price(upper) - sqrt_price(lower))
export function estimateLiquidityForTokenB(
  sqrtPrice1: BN,
  sqrtPrice2: BN,
  tokenAmount: BN
) {
  const lowerSqrtPriceX64 = BN.min(sqrtPrice1, sqrtPrice2)
  const upperSqrtPriceX64 = BN.max(sqrtPrice1, sqrtPrice2)

  const delta = upperSqrtPriceX64.sub(lowerSqrtPriceX64)

  return tokenAmount.shln(64).div(delta)
}
