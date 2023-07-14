import { Percentage } from '@orca-so/common-sdk'
import { SwapUtils } from '@orca-so/whirlpools-sdk'
import { Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { getAccountData } from '..'
import { simulateSwap } from './simulate-swap'
import { getTickArrayKeysForSwap } from '../tick-arrays'
import { SwapQuote, SwapQuoteParam } from './types'
import { TickArray } from '../../types/accounts'
import { ParsableGlobalpool, ParsableTickArray } from '../../types/parsing'

/**
 * Get an estimated swap quote using input token amount.
 *
 * @param globalpool - Globalpool to perform the swap on
 * @param inputTokenMint - PublicKey for the input token mint to swap with
 * @param tokenAmount - The amount of input token to swap from
 * @param slippageTolerance - The amount of slippage to account for in this quote
 * @param programId - PublicKey for the Globalpool ProgramId
 * @param cache - GlobalpoolAccountCacheInterface instance object to fetch solana accounts
 * @param opts an {@link GlobalpoolAccountFetchOptions} object to define fetch and cache options when accessing on-chain accounts
 * @returns a SwapQuote object with slippage adjusted SwapInput parameters & estimates on token amounts, fee & end globalpool states.
 */
export async function swapQuoteByInputToken(
  globalpool: PublicKey,
  inputTokenMint: PublicKey,
  tokenAmount: BN,
  slippageTolerance: Percentage,
  connection: Connection,
  programId: PublicKey
): Promise<SwapQuote> {
  const params = await swapQuoteByToken(
    globalpool,
    inputTokenMint,
    tokenAmount,
    true,
    connection,
    programId
  )
  return swapQuoteWithParams(params, slippageTolerance)
}

/**
 * Get an estimated swap quote using an output token amount.
 *
 * Use this quote to get an estimated amount of input token needed to receive
 * the defined output token amount.
 *
 * @category Quotes
 * @param globalpool - Globalpool to perform the swap on
 * @param outputTokenMint - PublicKey for the output token mint to swap into
 * @param tokenAmount - The maximum amount of output token to receive in this swap.
 * @param slippageTolerance - The amount of slippage to account for in this quote
 * @param programId - PublicKey for the Globalpool ProgramId
 * @param cache - GlobalpoolAccountCacheInterface instance to fetch solana accounts
 * @param opts an {@link GlobalpoolAccountFetchOptions} object to define fetch and cache options when accessing on-chain accounts
 * @returns a SwapQuote object with slippage adjusted SwapInput parameters & estimates on token amounts, fee & end globalpool states.
 */
export async function swapQuoteByOutputToken(
  globalpool: PublicKey,
  outputTokenMint: PublicKey,
  tokenAmount: BN,
  slippageTolerance: Percentage,
  connection: Connection,
  programId: PublicKey
): Promise<SwapQuote> {
  const params = await swapQuoteByToken(
    globalpool,
    outputTokenMint,
    tokenAmount,
    false,
    connection,
    programId
  )
  return swapQuoteWithParams(params, slippageTolerance)
}

/**
 * Perform a sync swap quote based on the basic swap instruction parameters.
 *
 * @category Quotes
 * @param params - SwapQuote parameters
 * @param slippageTolerance - The amount of slippage to account for when generating the final quote.
 * @returns a SwapQuote object with slippage adjusted SwapInput parameters & estimates on token amounts, fee & end globalpool states.
 */
export function swapQuoteWithParams(
  params: SwapQuoteParam,
  slippageTolerance: Percentage
): SwapQuote {
  const quote = simulateSwap(params)

  const slippageAdjustedQuote: SwapQuote = {
    ...quote,
    ...SwapUtils.calculateSwapAmountsFromQuote(
      quote.amount,
      quote.estimatedAmountIn,
      quote.estimatedAmountOut,
      slippageTolerance,
      quote.amountSpecifiedIsInput
    ),
  }

  return slippageAdjustedQuote
}

async function swapQuoteByToken(
  globalpool: PublicKey,
  inputTokenMint: PublicKey,
  tokenAmount: BN,
  amountSpecifiedIsInput: boolean,
  connection: Connection,
  programId: PublicKey
): Promise<SwapQuoteParam> {
  const globalpoolInfo = await getAccountData(
    globalpool,
    ParsableGlobalpool,
    connection
  )

  if (!globalpoolInfo) {
    throw new Error('Globalpool not found')
  }

  if (
    !inputTokenMint.equals(globalpoolInfo.tokenMintA) &&
    !inputTokenMint.equals(globalpoolInfo.tokenMintB)
  ) {
    throw new Error('Input token is not in the globalpool')
  }

  const swapA2B = inputTokenMint.equals(globalpoolInfo.tokenMintA)

  const tickArrayKeys = getTickArrayKeysForSwap(
    globalpoolInfo.tickCurrentIndex,
    globalpoolInfo.tickSpacing,
    swapA2B,
    globalpool,
    programId
  )

  const tickArrays = await Promise.all(
    tickArrayKeys.map(
      async (tickArrayKey) =>
        ({
          address: tickArrayKey,
          data: await getAccountData(
            tickArrayKey,
            ParsableTickArray,
            connection
          ),
        } as TickArray)
    )
  )

  return {
    globalpoolData: globalpoolInfo,
    tokenAmount,
    aToB: swapA2B,
    amountSpecifiedIsInput,
    sqrtPriceLimit: SwapUtils.getDefaultSqrtPriceLimit(swapA2B),
    otherAmountThreshold: SwapUtils.getDefaultOtherAmountThreshold(
      amountSpecifiedIsInput
    ),
    tickArrays,
  }
}
