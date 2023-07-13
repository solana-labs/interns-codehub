import { BN } from '@coral-xyz/anchor'
import { Account, Mint } from '@solana/spl-token'
import { AccountInfo, PublicKey } from '@solana/web3.js'

export enum AccountName {
  LiquidityPosition = "LiquidityPosition",
  TradePosition = "TradePosition",
  TickArray = "TickArray",
  Globalpool = "Globalpool",
}

export type BasicSupportedTypes = Account | Mint

export type GlobalpoolData = {
	bump: number,
	tickSpacing: number,
	tickSpacingSeed: number,
  feeRate: number
	feeRateSeed: number,
  protocolFeeRate: number
  liquidityAvailable: bigint
	liquidityBorrowedA: bigint
	liquidityBorrowedB: bigint
	liquidityTradeLockedA: bigint
	liquidityTradeLockedB: bigint
  sqrtPrice: bigint
  tickCurrentIndex: number
  protocolFeeOwedA: bigint
  protocolFeeOwedB: bigint
  tokenMintA: PublicKey
  tokenVaultA: PublicKey
  feeGrowthGlobalA: bigint
  tokenMintB: PublicKey
  tokenVaultB: PublicKey
  feeGrowthGlobalB: bigint
  inceptionTime: bigint
	feeAuthority: PublicKey
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
  globalpool: PublicKey
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