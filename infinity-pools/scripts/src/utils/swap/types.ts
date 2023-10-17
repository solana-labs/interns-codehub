import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { GlobalpoolData, TickArray } from '../../types/accounts'

export type SwapResult = {
  amountA: BN
  amountB: BN
  nextTickIndex: number
  nextSqrtPrice: BN
  totalFeeAmount: BN
}

export type SwapStep = {
  amountIn: BN
  amountOut: BN
  nextPrice: BN
  feeAmount: BN
}

/**
 * Raw parameters and accounts to swap on a Globalpool
 * @param swapInput - Parameters in {@link SwapInput}
 * @param globalpool - PublicKey for the globalpool that the swap will occur on
 * @param tokenOwnerAccountA - PublicKey for the associated token account for tokenA in the collection wallet
 * @param tokenOwnerAccountB - PublicKey for the associated token account for tokenB in the collection wallet
 * @param tokenVaultA - PublicKey for the tokenA vault for this globalpool.
 * @param tokenVaultB - PublicKey for the tokenB vault for this globalpool.
 * @param oracle - PublicKey for the oracle account for this Globalpool.
 * @param tokenAuthority - authority to withdraw tokens from the input token account
 */
export type SwapParams = SwapInput & {
  globalpool: PublicKey
  tokenOwnerAccountA: PublicKey
  tokenOwnerAccountB: PublicKey
  tokenVaultA: PublicKey
  tokenVaultB: PublicKey
  oracle: PublicKey
  tokenAuthority: PublicKey
}

/**
 * Parameters that describe the nature of a swap on a Globalpool.
 * @param aToB - The direction of the swap. True if swapping from A to B. False if swapping from B to A.
 * @param amountSpecifiedIsInput - Specifies the token the parameter `amount`represents. If true, the amount represents
 *                                 the input token of the swap.
 * @param amount - The amount of input or output token to swap from (depending on amountSpecifiedIsInput).
 * @param otherAmountThreshold - The maximum/minimum of input/output token to swap into (depending on amountSpecifiedIsInput).
 * @param sqrtPriceLimit - The maximum/minimum price the swap will swap to.
 * @param tickArray0 - PublicKey of the tick-array where the Globalpool's currentTickIndex resides in
 * @param tickArray1 - The next tick-array in the swap direction. If the swap will not reach the next tick-aray, input the same array as tickArray0.
 * @param tickArray2 - The next tick-array in the swap direction after tickArray2. If the swap will not reach the next tick-aray, input the same array as tickArray1.
 */
export type SwapInput = {
  amount: BN
  otherAmountThreshold: BN
  sqrtPriceLimit: BN
  amountSpecifiedIsInput: boolean
  aToB: boolean
  tickArray0: PublicKey
  tickArray1: PublicKey
  tickArray2: PublicKey
}

/**
 * @param tokenAmount - The amount of input or output token to swap from (depending on amountSpecifiedIsInput).
 * @param otherAmountThreshold - The maximum/minimum of input/output token to swap into (depending on amountSpecifiedIsInput).
 * @param sqrtPriceLimit - The maximum/minimum price the swap will swap to.
 * @param aToB - The direction of the swap. True if swapping from A to B. False if swapping from B to A.
 * @param amountSpecifiedIsInput - Specifies the token the parameter `amount`represents. If true, the amount represents
 *                                 the input token of the swap.
 * @param tickArrays - An sequential array of tick-array objects in the direction of the trade to swap on
 */
export type SwapQuoteParam = {
  globalpoolData: GlobalpoolData
  tokenAmount: BN
  otherAmountThreshold: BN
  sqrtPriceLimit: BN
  aToB: boolean
  amountSpecifiedIsInput: boolean
  tickArrays: TickArray[]
}

/**
 * A collection of estimated values from quoting a swap that collects a developer-fee.
 * @param estimatedAmountIn - Approximate number of input token swapped in the swap
 * @param estimatedAmountOut - Approximate number of output token swapped in the swap
 * @param estimatedEndTickIndex - Approximate tick-index the Globalpool will land on after this swap
 * @param estimatedEndSqrtPrice - Approximate sqrtPrice the Globalpool will land on after this swap
 * @param estimatedFeeAmount - Approximate feeAmount (all fees) charged on this swap
 * @param estimatedSwapFeeAmount - Approximate feeAmount (LP + protocol fees) charged on this swap
 * @param devFeeAmount -  FeeAmount (developer fees) charged on this swap
 */
export type DevFeeSwapQuote = NormalSwapQuote & {
  // NOTE: DevFeeSwaps supports input-token based swaps only as it is difficult
  // to collect an exact % amount of dev-fees for output-token based swaps due to slippage.
  // If there are third party requests in the future for this functionality, we can launch it
  // but with the caveat that the % collected is only an estimate.
  amountSpecifiedIsInput: true
  estimatedSwapFeeAmount: BN
  devFeeAmount: BN
}

/**
 * A collection of estimated values from quoting a swap.
 * @link {BaseSwapQuote}
 * @link {DevFeeSwapQuote}
 */
export type SwapQuote = NormalSwapQuote | DevFeeSwapQuote

/**
 * A collection of estimated values from quoting a swap.
 * @param estimatedAmountIn - Approximate number of input token swapped in the swap
 * @param estimatedAmountOut - Approximate number of output token swapped in the swap
 * @param estimatedEndTickIndex - Approximate tick-index the Globalpool will land on after this swap
 * @param estimatedEndSqrtPrice - Approximate sqrtPrice the Globalpool will land on after this swap
 * @param estimatedFeeAmount - Approximate feeAmount (all fees) charged on this swap
 */
export type SwapEstimates = {
  estimatedAmountIn: BN
  estimatedAmountOut: BN
  estimatedEndTickIndex: number
  estimatedEndSqrtPrice: BN
  estimatedFeeAmount: BN
}

/**
 * A collection of estimated values from quoting a swap. Object can be directly used in a swap transaction.
 */
export type NormalSwapQuote = SwapInput & SwapEstimates
