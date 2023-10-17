import { SwapMode } from '@jup-ag/core'
import { PublicKey } from '@solana/web3.js'

export type SwapRouteParams = {
  a2b: boolean
  tokenA: PublicKey
  tokenB: PublicKey
  amount: number
  slippageBps: number
  feeBps: number
  swapMode?: SwapMode
}