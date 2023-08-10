import { PublicKey } from '@solana/web3.js'
import { Token } from '@solflare-wallet/utl-sdk'

// export * from '@/lib/closeLiquidityPosition'
export * from '@/lib/closeTradePosition'
export * from '@/lib/getAccountData'
export * from '@/lib/getGlobalpool'
export * from '@/lib/getPositions'
export * from '@/lib/interest'
export * from '@/lib/openTradePosition'
export * from '@/lib/swapPool'


export const QUOTE_TOKENS: { [mint: string]: number } = {
  // [TOKEN_LIST["USDT"]]: 100,
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 90, // USDC
  // [TOKEN_LIST["USDH"]]: 80, // USDH
  'So11111111111111111111111111111111111111112': 70, // SOL
  // [TOKEN_LIST["mSOL"]]: 60, // mSOL
  // [TOKEN_LIST["stSOL"]]: 50, // stSOL
}

const DEFAULT_QUOTE_PRIORITY = 0

export function getQuoteTokenPriority(mint: string): number {
  const value = QUOTE_TOKENS[mint]
  if (value) return value
  return DEFAULT_QUOTE_PRIORITY
}

export function sortByQuotePriority(mintLeft: PublicKey, mintRight: PublicKey): number {
  return getQuoteTokenPriority(mintLeft.toString()) - getQuoteTokenPriority(mintRight.toString())
}

export function sortTokenByQuotePriority(tokenLeft: Token, tokenRight: Token): number {
  return getQuoteTokenPriority(tokenLeft.address) - getQuoteTokenPriority(tokenRight.address)
}
