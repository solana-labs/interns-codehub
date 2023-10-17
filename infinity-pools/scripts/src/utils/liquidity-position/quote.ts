import { DecimalUtil, Percentage } from '@orca-so/common-sdk'
import { PriceMath, TickUtil } from '@orca-so/whirlpools-sdk'
import { Mint } from '@solana/spl-token'
import BN from 'bn.js'
import Decimal from 'decimal.js'
import invariant from 'tiny-invariant'

import { ZERO_BN } from '../../constants'
import {
  IncreaseLiquidityInput,
  IncreaseLiquidityQuoteParam,
  PositionStatus,
} from './types'
import { GlobalpoolData } from '../../types/accounts'
import {
  PositionUtil,
  adjustForSlippage,
  getLiquidityFromTokenA,
  getLiquidityFromTokenB,
  getTokenAFromLiquidity,
  getTokenBFromLiquidity,
} from './utils'

/**
 * Return object from increase liquidity quote functions.
 * @category Quotes
 */
export type IncreaseLiquidityQuote = IncreaseLiquidityInput & {
  tokenEstA: BN
  tokenEstB: BN
}

/**
 * Get an estimated quote on the maximum tokens required to deposit based on a specified input token amount.
 *
 * @category Quotes
 * @param inputTokenAmount - The amount of input tokens to deposit.
 * @param inputTokenMint - The mint of the input token the user would like to deposit.
 * @param tickLower - The lower index of the position that we are withdrawing from.
 * @param tickUpper - The upper index of the position that we are withdrawing from.
 * @param slippageTolerance - The maximum slippage allowed when calculating the minimum tokens received.
 * @param whirlpool - A Whirlpool helper class to help interact with the Whirlpool account.
 * @returns An IncreaseLiquidityInput object detailing the required token amounts & liquidity values to use when calling increase-liquidity-ix.
 */
export function increaseLiquidityQuoteByInputToken(
  globalpoolData: GlobalpoolData,
  inputTokenMint: Mint,
  inputTokenAmount: Decimal,
  tickLower: number,
  tickUpper: number,
  slippageTolerance: Percentage
) {
  const _globalpoolData = {
    ...globalpoolData,
    sqrtPrice: new BN(globalpoolData.sqrtPrice.toString()),
  }

  return increaseLiquidityQuoteByInputTokenWithParams({
    inputTokenMint: inputTokenMint.address,
    inputTokenAmount: DecimalUtil.toBN(
      inputTokenAmount,
      inputTokenMint.decimals
    ),
    tickLowerIndex: TickUtil.getInitializableTickIndex(
      tickLower,
      globalpoolData.tickSpacing
    ),
    tickUpperIndex: TickUtil.getInitializableTickIndex(
      tickUpper,
      globalpoolData.tickSpacing
    ),
    slippageTolerance,
    ..._globalpoolData,
  })
}

/**
 * Get an estimated quote on the maximum tokens required to deposit based on a specified input token amount.
 *
 * @category Quotes
 * @param param IncreaseLiquidityQuoteParam
 * @returns An IncreaseLiquidityInput object detailing the required token amounts & liquidity values to use when calling increase-liquidity-ix.
 */
export function increaseLiquidityQuoteByInputTokenWithParams(
  param: IncreaseLiquidityQuoteParam
): IncreaseLiquidityQuote {
  invariant(
    TickUtil.checkTickInBounds(param.tickLowerIndex),
    'tickLowerIndex is out of bounds.'
  )
  invariant(
    TickUtil.checkTickInBounds(param.tickUpperIndex),
    'tickUpperIndex is out of bounds.'
  )
  invariant(
    param.inputTokenMint.equals(param.tokenMintA) ||
      param.inputTokenMint.equals(param.tokenMintB),
    `input token mint ${param.inputTokenMint.toBase58()} does not match any tokens in the provided pool.`
  )

  const positionStatus = PositionUtil.getPositionStatus(
    param.tickCurrentIndex,
    param.tickLowerIndex,
    param.tickUpperIndex
  )

  switch (positionStatus) {
    case PositionStatus.BelowRange:
      return quotePositionBelowRange(param)
    case PositionStatus.InRange:
      return quotePositionInRange(param)
    case PositionStatus.AboveRange:
      return quotePositionAboveRange(param)
    default:
      throw new Error(`type ${positionStatus} is an unknown PositionStatus`)
  }
}

/*** Private ***/

function quotePositionBelowRange(
  param: IncreaseLiquidityQuoteParam
): IncreaseLiquidityQuote {
  const {
    tokenMintA,
    inputTokenMint,
    inputTokenAmount,
    tickLowerIndex,
    tickUpperIndex,
    slippageTolerance,
  } = param

  if (!tokenMintA.equals(inputTokenMint)) {
    return {
      tokenMaxA: ZERO_BN,
      tokenMaxB: ZERO_BN,
      tokenEstA: ZERO_BN,
      tokenEstB: ZERO_BN,
      liquidityAmount: ZERO_BN,
    }
  }

  const sqrtPriceLowerX64 = PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex)
  const sqrtPriceUpperX64 = PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex)

  const liquidityAmount = getLiquidityFromTokenA(
    inputTokenAmount,
    sqrtPriceLowerX64,
    sqrtPriceUpperX64,
    false
  )

  const tokenEstA = getTokenAFromLiquidity(
    liquidityAmount,
    sqrtPriceLowerX64,
    sqrtPriceUpperX64,
    true
  )
  const tokenMaxA = adjustForSlippage(tokenEstA, slippageTolerance, true)

  return {
    tokenMaxA,
    tokenMaxB: ZERO_BN,
    tokenEstA,
    tokenEstB: ZERO_BN,
    liquidityAmount,
  }
}

function quotePositionInRange(
  param: IncreaseLiquidityQuoteParam
): IncreaseLiquidityQuote {
  const {
    tokenMintA,
    sqrtPrice,
    inputTokenMint,
    inputTokenAmount,
    tickLowerIndex,
    tickUpperIndex,
    slippageTolerance,
  } = param

  const sqrtPriceX64 = sqrtPrice
  const sqrtPriceLowerX64 = PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex)
  const sqrtPriceUpperX64 = PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex)

  let [tokenEstA, tokenEstB] = tokenMintA.equals(inputTokenMint)
    ? [inputTokenAmount, undefined]
    : [undefined, inputTokenAmount]

  let liquidityAmount: BN

  if (tokenEstA) {
    liquidityAmount = getLiquidityFromTokenA(
      tokenEstA,
      sqrtPriceX64,
      sqrtPriceUpperX64,
      false
    )
    tokenEstA = getTokenAFromLiquidity(
      liquidityAmount,
      sqrtPriceX64,
      sqrtPriceUpperX64,
      true
    )
    tokenEstB = getTokenBFromLiquidity(
      liquidityAmount,
      sqrtPriceLowerX64,
      sqrtPriceX64,
      true
    )
  } else if (tokenEstB) {
    liquidityAmount = getLiquidityFromTokenB(
      tokenEstB,
      sqrtPriceLowerX64,
      sqrtPriceX64,
      false
    )
    tokenEstA = getTokenAFromLiquidity(
      liquidityAmount,
      sqrtPriceX64,
      sqrtPriceUpperX64,
      true
    )
    tokenEstB = getTokenBFromLiquidity(
      liquidityAmount,
      sqrtPriceLowerX64,
      sqrtPriceX64,
      true
    )
  } else {
    throw new Error('invariant violation')
  }

  const tokenMaxA = adjustForSlippage(tokenEstA, slippageTolerance, true)
  const tokenMaxB = adjustForSlippage(tokenEstB, slippageTolerance, true)

  return {
    tokenMaxA,
    tokenMaxB,
    tokenEstA: tokenEstA!,
    tokenEstB: tokenEstB!,
    liquidityAmount,
  }
}

function quotePositionAboveRange(
  param: IncreaseLiquidityQuoteParam
): IncreaseLiquidityQuote {
  const {
    tokenMintB,
    inputTokenMint,
    inputTokenAmount,
    tickLowerIndex,
    tickUpperIndex,
    slippageTolerance,
  } = param
  // console.log(param)

  if (!tokenMintB.equals(inputTokenMint)) {
    return {
      tokenMaxA: ZERO_BN,
      tokenMaxB: ZERO_BN,
      tokenEstA: ZERO_BN,
      tokenEstB: ZERO_BN,
      liquidityAmount: ZERO_BN,
    }
  }

  const sqrtPriceLowerX64 = PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex)
  const sqrtPriceUpperX64 = PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex)
  const liquidityAmount = getLiquidityFromTokenB(
    inputTokenAmount,
    sqrtPriceLowerX64,
    sqrtPriceUpperX64,
    false
  )

  const tokenEstB = getTokenBFromLiquidity(
    liquidityAmount,
    sqrtPriceLowerX64,
    sqrtPriceUpperX64,
    true
  )
  const tokenMaxB = adjustForSlippage(tokenEstB, slippageTolerance, true)

  return {
    tokenMaxA: ZERO_BN,
    tokenMaxB,
    tokenEstA: ZERO_BN,
    tokenEstB,
    liquidityAmount,
  }
}
