import { BN } from '@coral-xyz/anchor'
import { Account, Mint } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

/**
 * Supported parasable account names from the Clad contract.
 */
export enum AccountName {
  LiquidityPosition = "LiquidityPosition",
  TradePosition = "TradePosition",
  TickArray = "TickArray",
  Globalpool = "Globalpool",
}

export type BasicSupportedTypes = Account | Mint

// TODO: update
export type GlobalpoolData = {
  feeRate: number
  protocolFeeRate: number
  liquidity: BN
  sqrtPrice: BN
  tickCurrentIndex: number
  protocolFeeOwedA: BN
  protocolFeeOwedB: BN
  tokenMintA: PublicKey
  tokenVaultA: PublicKey
  feeGrowthGlobalA: BN
  tokenMintB: PublicKey
  tokenVaultB: PublicKey
  feeGrowthGlobalB: BN
  tickSpacing: number
}

// TODO: update
export type LiquidityPositionData = {
  whirlpool: PublicKey
  positionMint: PublicKey
  liquidity: BN
  tickLowerIndex: number
  tickUpperIndex: number
  feeGrowthCheckpointA: BN
  feeOwedA: BN
  feeGrowthCheckpointB: BN
  feeOwedB: BN
}

// TODO: update
export type TradePositionData = {
  whirlpool: PublicKey
  positionMint: PublicKey
  liquidity: BN
  tickLowerIndex: number
  tickUpperIndex: number
}

// TODO: update
export type TickData = {
  initialized: boolean
  liquidityNet: BN
  liquidityGross: BN
  liquidityBorrowed: BN
  feeGrowthOutsideA: BN
  feeGrowthOutsideB: BN
}

// TODO: update
export type TickArrayData = {
  whirlpool: PublicKey
  startTickIndex: number
  ticks: TickData[]
}

export type CladSupportedTypes =
  | GlobalpoolData
  | LiquidityPositionData
  | TradePositionData
  | TickArrayData
  | BasicSupportedTypes

/**
 * Extended Mint type to host token info.
 * @category WhirlpoolClient
 */
export type TokenInfo = Mint & { mint: PublicKey };

/**
 * Extended (token) Account type to host account info for a Token.
 * @category WhirlpoolClient
 */
export type TokenAccountInfo = Account;

/**
 * A wrapper class of a TickArray on a Whirlpool
 * @category WhirlpoolClient
 */
export type TickArray = {
  address: PublicKey;
  data: TickArrayData | null;
};