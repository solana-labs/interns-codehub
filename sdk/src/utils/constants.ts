import * as anchor from '@coral-xyz/anchor'
import { MathUtil } from '@orca-so/common-sdk'
import { ConfirmOptions } from '@solana/web3.js'
import Decimal from 'decimal.js'

export enum TickSpacing {
  One = 1,
  Stable = 8,
  ThirtyTwo = 32,
  SixtyFour = 64,
  Standard = 128,
}

export const DEFAULT_FEE_RATE = 3000
export const DEFAULT_MINT_AMOUNT = new anchor.BN('15000000000')
export const DEFAULT_SQRT_PRICE = MathUtil.toX64(new Decimal(5))

export const DEFAULT_INIT_FEE_TIER = [{ tickSpacing: TickSpacing.Standard }]
export const DEFAULT_INIT_MINT = [{}, {}]
export const DEFAULT_INIT_TOKEN = [{ mintIndex: 0 }, { mintIndex: 1 }]

export const defaultConfirmOptions: ConfirmOptions = {
  commitment: 'confirmed',
  preflightCommitment: 'confirmed',
}
