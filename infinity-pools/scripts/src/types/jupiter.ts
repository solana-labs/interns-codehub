import { SwapMode } from '@jup-ag/core'
import { PublicKey } from '@solana/web3.js'

export interface SwapRouteParams {
  a2b: boolean
  tokenA: PublicKey
  tokenB: PublicKey
  amount: number
  slippageBps: number
  feeBps: number
  swapMode?: SwapMode
}