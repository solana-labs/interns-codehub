import { SingleLevelAmmValidator } from '@jup-ag/core/dist/lib/ammValidator'
import { Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import CLAD_IDL from '@/target/idl/clad.json'

export const CLAD_PROGRAM_ID = new PublicKey('GH4aPZ5bXQr3MhN6MrejxKLTj6gUdyrGZvieagrfA3ke')

export { CLAD_IDL }

export const LOCALNET_CONNECTION = new Connection('http://127.0.0.1:8899')

export const JUPITER_PROGRAM_ID = 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB' // v4

export const GLOBALPOOL_STRUCT_SIZE = 672 // Size of Globalpool struct, std::mem::size_of::<Globalpool>()

export const ZERO_BN = new BN(0)

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

export const testJupiterAmmsToExclude: SingleLevelAmmValidator = {
  Aldrin: true,
  Crema: true,
  Cropper: true,
  Cykura: true,
  DeltaFi: true,
  GooseFX: true,
  Invariant: true,
  Lifinity: true,
  'Lifinity V2': true,
  Marinade: true,
  Mercurial: true,
  Meteora: true,
  Orca: false,
  'Orca (Whirlpools)': false,
  Raydium: true,
  'Raydium CLMM': true,
  Saber: true,
  Serum: true,
  Step: true,
  Penguin: true,
  Saros: true,
  Stepn: true,
  Sencha: true,
  'Saber (Decimals)': true,
  Dradex: true,
  Balansol: true,
  Openbook: true,
  Oasis: true,
  BonkSwap: true,
  Phoenix: true,
  Symmetry: true,
  Unknown: true,
}
