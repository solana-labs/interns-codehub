import { BN } from '@coral-xyz/anchor'
import { Account, Mint } from '@solana/spl-token'
import { AccountInfo, PublicKey } from '@solana/web3.js'

export enum AccountName {
  LiquidityPosition = 'LiquidityPosition',
  TradePosition = 'TradePosition',
  TickArray = 'TickArray',
  Globalpool = 'Globalpool',
}

export type BasicSupportedTypes = Account | Mint

export type GlobalpoolData = {
  bump: number
  tickSpacing: number
  tickSpacingSeed: number
  feeRate: number
  feeRateSeed: number
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

export type LiquidityPositionData = {
  globalpool: PublicKey
  positionMint: PublicKey
  liquidity: BN
  tickLowerIndex: number
  tickUpperIndex: number
  feeGrowthCheckpointA: BN
  feeOwedA: BN
  feeGrowthCheckpointB: BN
  feeOwedB: BN
}

export type TradePositionData = {
  globalpool: PublicKey
  positionMint: PublicKey
  tickLowerIndex: number
  tickUpperIndex: number
  liquidityAvailable: BN
  liquiditySwapped: BN
  liquidityMint: PublicKey
  collateralAmount: BN // u64 is BN
  collateralMint: PublicKey
  isTradeOpen: boolean
  openSlot: BN
  duration: BN
  interestRate: number
}

export type TickData = {
  initialized: boolean
  liquidityNet: BN
  liquidityGross: BN
  liquidityBorrowed: BN
  feeGrowthOutsideA: BN
  feeGrowthOutsideB: BN
}

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
 */
export type TokenInfo = Mint & { mint: PublicKey }

/**
 * Extended (token) Account type to host account info for a Token.
 */
export type TokenAccountInfo = Account

/**
 * A wrapper class of a TickArray on a Globalpool
 */
export type TickArray = {
  address: PublicKey
  data: TickArrayData | null
}
