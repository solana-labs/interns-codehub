import * as anchor from '@coral-xyz/anchor'
import { MathUtil, Percentage, TransactionBuilder } from '@orca-so/common-sdk'
import { Mint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js'
import * as assert from 'assert'
import Decimal from 'decimal.js'

import { Clad } from '@/target/types/clad'
import { consoleLogFull, getAccountData, getTokenBalance } from './utils'
import { ParsableGlobalpool } from './types/parsing'

async function main() {
  const provider = anchor.AnchorProvider.local('http://127.0.0.1:8899', {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  const { connection, wallet } = provider

  const program = anchor.workspace.Clad as anchor.Program<Clad>
  const programId = program.programId

  const [cladKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('clad')],
    programId
  )

  const tokenMintAKey = new PublicKey(
    'So11111111111111111111111111111111111111112'
  ) // SOL
  const tokenMintBKey = new PublicKey(
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  ) // USDC

  const feeRate = 500 // bps
  const tickSpacing = 64

  const globalpoolSeeds = [
    Buffer.from('globalpool'),
    tokenMintAKey.toBuffer(),
    tokenMintBKey.toBuffer(),
    new anchor.BN(feeRate).toArrayLike(Buffer, 'le', 2),
    new anchor.BN(tickSpacing).toArrayLike(Buffer, 'le', 2),
  ]

  const [globalpoolKey] = PublicKey.findProgramAddressSync(
    globalpoolSeeds,
    programId
  )

  console.log(`Clad: ${cladKey.toBase58()}`)
  console.log(`Globalpool: ${globalpoolKey.toBase58()}`)

  const globalpoolInfo = await getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )

  const tokenVaultABefore = new anchor.BN(
    await getTokenBalance(provider, globalpoolInfo.tokenVaultA)
  );
  const tokenVaultBBefore = new anchor.BN(
    await getTokenBalance(provider, globalpoolInfo.tokenVaultB)
  );

  consoleLogFull(globalpoolInfo)

  console.log('tokenVaultABefore', tokenVaultABefore)
  console.log('tokenVaultBBefore', tokenVaultBBefore)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
