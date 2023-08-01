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

export function tokenAddressToToken(address: string): TokenE | null {
  if (!Object.values(TOKEN_LIST).includes(address)) return null
  return Object.keys(TOKEN_LIST).find(key => TOKEN_LIST[key as TokenEKeys] === address) as TokenE
}

export function getTokenAddress(token: TokenEKeys) {
  return TOKEN_LIST[token]
}