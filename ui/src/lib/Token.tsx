import { PublicKey } from "@solana/web3.js";

import SOLIconCircle from "@/components/Icons/SOLIconCircle";
import USDCIconCircle from "@/components/Icons/USDCIconCircle";
import BonkIconCircle from "@/components/Icons/BONKIconCircle";

export enum TokenE {
  SOL = "SOL",
  USDC = "USDC",
  TEST_USDC = "Test_USDC",
  TEST_BONK = "Test_BONK",
}

// type TokenEType = Record<TokenE, string>;
type TokenEKeys = keyof typeof TokenE // => 'SOL' | 'USDC' | 'TEST_USDC' | ...
type TokenEValues = `${TokenE}` // => 'SOL' | 'USDC' | 'Test_USDC' | ...

export const TOKEN_LIST: Record<TokenEKeys, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  TEST_USDC: 'tbd1',
  TEST_BONK: 'tbd2',
}

const TOKEN_MINTS = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  SOL: "So11111111111111111111111111111111111111112",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  USDH: "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX",
  mSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  stSOL: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
};

type TokenListKeys = TokenEKeys
type TokenListValues = typeof TOKEN_LIST[TokenListKeys]

export function strAsToken(tokenStr: string): TokenE {
  if (!Object.values<string>(TokenE).includes(tokenStr)) throw new Error(`Invalid token string`)
  return tokenStr as TokenE // this works because we enforce `tokenStr` to be any value of enum `TokenE`
}

export function getTokenLabel(token: TokenE) {
  switch (token) {
    case TokenE.SOL:
      return "Solana";
    case TokenE.USDC:
      return "UDC Coin";
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
    case TokenE.TEST_USDC:
      return "TEST_USDCUSD";
    case TokenE.TEST_BONK:
      return "TEST_BONKUSD";
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
    case TokenE.TEST_BONK:
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

export function getTokenAddress(token: TokenEKeys) {
  return TOKEN_LIST[token]
}

export const QUOTE_TOKENS: { [mint: string]: number } = {
  [TOKEN_MINTS["USDT"]]: 100,
  [TOKEN_MINTS["USDC"]]: 90, // USDC
  [TOKEN_MINTS["USDH"]]: 80, // USDH
  [TOKEN_MINTS["SOL"]]: 70, // SOL
  [TOKEN_MINTS["mSOL"]]: 60, // mSOL
  [TOKEN_MINTS["stSOL"]]: 50, // stSOL
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

// first-depth key access only
export function sortObjectByQuotePriority(key: string){
  return (mintLeft: any & { [key: string]: PublicKey }, mintRight: any & { [key: string]: PublicKey }) => {
    if (!mintLeft[key] || !mintRight[key]) throw new Error('invalid key in sorting object by quote priority')
    return sortByQuotePriority(mintLeft[key]!!, mintRight[key]!!)
  }
}