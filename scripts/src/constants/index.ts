import { BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

export { Clad } from '@/target/types/clad'

export const TICK_ARRAY_SIZE = 88

export const MAX_SWAP_TICK_ARRAYS = 3

/**
 * The max tick index supported by Globalpools.
 */
export const MAX_TICK_INDEX = 443636

/**
 * The min tick index supported by Globalpools.
 */
export const MIN_TICK_INDEX = -443636

/**
 * The max sqrt-price supported by Globalpools.
 */
export const MAX_SQRT_PRICE = '79226673515401279992447579055'

/**
 * The min sqrt-price supported by Globalpools.
 */
export const MIN_SQRT_PRICE = '4295048016'

/**
 * The denominator which the protocol fee rate is divided on.
 */
export const PROTOCOL_FEE_RATE_MUL_VALUE = new BN(10_000)

/**
 * The denominator which the fee rate is divided on.
 */
export const FEE_RATE_MUL_VALUE = new BN(1_000_000)

export const ZERO_BN = new BN(0)

export const tokenMintSOL = new PublicKey(
  'So11111111111111111111111111111111111111112'
)

export const tokenMintUSDC = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
)

export const ORCA = new PublicKey('orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE')

export const WBTC = new PublicKey(
  '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E'
)

export const WETH = new PublicKey(
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs'
)

export const MSOL = new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So')

export const MNDE = new PublicKey('MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey')

export const SAMO = new PublicKey(
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
)
