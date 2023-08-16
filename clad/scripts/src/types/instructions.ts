import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

export type PDA = {
  publicKey: PublicKey
  bump: number
}

export type InitTickArrayParams = {
  globalpool: PublicKey
  tickArray: PublicKey // tickArrayPda: PDA
  startTick: number
  // funder: PublicKey;
}

export type OpenPositionParams = {
  tickLowerIndex: number
  tickUpperIndex: number
  liquidityAmount: anchor.BN
}

export type OpenLiquidityPositionAccounts = {
  positionAuthority: PublicKey
  globalpool: PublicKey
  tokenMintA: PublicKey
  tokenMintB: PublicKey
  tokenVaultA: PublicKey
  tokenVaultB: PublicKey
  position: PublicKey
  positionMint: PublicKey
  positionTokenAccount: PublicKey
  associatedTokenProgram: PublicKey
  tokenProgram: PublicKey
  systemProgram: PublicKey
  rent: PublicKey
}
