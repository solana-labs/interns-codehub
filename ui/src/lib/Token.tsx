import { PublicKey } from "@solana/web3.js";

import SOLIconCircle from "@/components/Icons/SOLIconCircle";
import USDCIconCircle from "@/components/Icons/USDCIconCircle";
import BonkIconCircle from "@/components/Icons/BONKIconCircle";
import { Token } from "@solflare-wallet/utl-sdk";

export enum TokenE {
  SOL = "SOL",
  USDC = "USDC",
  BONK = "BONK",
  FIDA = "FIDA",
  HNT = "HNT",
  IOT = "IOT",
  TEST_USDC = "Test_USDC",
  TEST_BONK = "Test_BONK",
}

// type TokenEType = Record<TokenE, string>;
type TokenEKeys = keyof typeof TokenE // => 'SOL' | 'USDC' | 'TEST_USDC' | ...
type TokenEValues = `${TokenE}` // => 'SOL' | 'USDC' | 'Test_USDC' | ...

export const TOKEN_LIST: Record<TokenEKeys, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  FIDA: 'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp',
  HNT: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux',
  IOT: 'iotEVVZLEywoTn1QdwNPddxPWszn3zFhEot3MfL9fns',

  TEST_USDC: 'tbd1',
  TEST_BONK: 'tbd2',

  // USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  // USDH: "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX",
  // mSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  // stSOL: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
}

export const TOKEN_INFO: Record<TokenE, { name: string, symbol: string, decimals: number }> = {
  SOL: { name: 'Solana', symbol: 'SOL', decimals: 9 },
  USDC: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  BONK: { name: 'Bonk', symbol: 'BONK', decimals: 5 },
  FIDA: { name: 'Bonfida', symbol: 'FIDA', decimals: 6 },
  HNT: { name: 'Helium', symbol: 'HNT', decimals: 8 },
  IOT: { name: 'Helium IOT', symbol: 'IOT', decimals: 6 },
  Test_USDC: { name: 'Test USDC', symbol: 'TEST_USDC', decimals: 6 },
  Test_BONK: { name: 'Test Bonk', symbol: 'TEST_BONK', decimals: 6 },
}

type TokenListKeys = TokenEKeys
type TokenListValues = typeof TOKEN_LIST[TokenListKeys]

export function strAsToken(tokenStr: string): TokenE | undefined {
  if (!Object.values<string>(TokenE).includes(tokenStr)) return undefined // throw new Error(`Invalid token string`)
  return tokenStr as TokenE // this works because we enforce `tokenStr` to be any value of enum `TokenE`
}

export function isTokenStable(token: TokenE) {
  return token === TokenE.USDC || token === TokenE.TEST_USDC
}

// export function combineTokensIntoPair(tokenA: TokenE, tokenB: TokenE) {
//   return `${tokenA}-${tokenB}`
// }

export function getTokenLabel(token: TokenE) {
  switch (token) {
    case TokenE.SOL:
      return "Solana";
    case TokenE.USDC:
      return "UDC Coin";
    case TokenE.BONK:
      return "Bonk";
    case TokenE.FIDA:
      return "Bonfida";
    case TokenE.HNT:
      return "Helium";
    case TokenE.IOT:
      return "Helium IOT";
    case TokenE.TEST_USDC:
      return "Test USDC";
    case TokenE.TEST_BONK:
      return "Test Bonk";
  }
}

export function getSymbol(token: TokenE) {
  switch (token) {
    case TokenE.SOL:
      return "SOLUSD";
    case TokenE.USDC:
      return "USDCUSD";
    case TokenE.BONK:
      return "BONKUSD";
    case TokenE.FIDA:
      return "FIDAUSD";
    case TokenE.HNT:
      return "HNTUSD";
    case TokenE.IOT:
      return "IOTUSD";
    case TokenE.TEST_USDC:
      return "TEST_USDCUSD";
    case TokenE.TEST_BONK:
      return "TEST_BONKUSD";
    default:
      return "SOLUSD";
  }
}

export function getTokenIcon(token: TokenE) {
  switch (token) {
    case TokenE.SOL:
      return <SOLIconCircle />;
    case TokenE.USDC:
      return <USDCIconCircle />;
    case TokenE.TEST_USDC:
      return <USDCIconCircle />;
    default:
      return <BonkIconCircle />;
  }
}

export function getTokenId(token: TokenE) {
  switch (token) {
    case TokenE.SOL:
      return "solana";
    case TokenE.USDC:
      return "usd-coin";
    case TokenE.TEST_USDC:
      return "usd-test";
    case TokenE.TEST_BONK:
      return "bonk";
  }
}

export function tokenAddressToToken(address: PublicKey | string): TokenE | null {
  const _address = address instanceof PublicKey ? address.toBase58() : address
  if (!Object.values(TOKEN_LIST).includes(_address)) return null
  return Object.keys(TOKEN_LIST).find(key => TOKEN_LIST[key as TokenEKeys] === _address) as TokenE
}

export function getTokenAddress(token: TokenE | TokenEKeys) {
  return TOKEN_LIST[token as TokenEKeys]
}

export const QUOTE_TOKENS: { [mint: string]: number } = {
  // [TOKEN_LIST["USDT"]]: 100,
  [TOKEN_LIST["USDC"]]: 90, // USDC
  // [TOKEN_LIST["USDH"]]: 80, // USDH
  [TOKEN_LIST["SOL"]]: 70, // SOL
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

// first-depth key access only
export function sortObjectByQuotePriority(key: string) {
  return (mintLeft: any & { [key: string]: PublicKey }, mintRight: any & { [key: string]: PublicKey }) => {
    if (!mintLeft[key] || !mintRight[key]) throw new Error('invalid key in sorting object by quote priority')
    return sortByQuotePriority(mintLeft[key]!!, mintRight[key]!!)
  }
}