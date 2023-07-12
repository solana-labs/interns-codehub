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

async function main() {
  const provider = anchor.AnchorProvider.local('http://127.0.0.1:8899', {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  const { connection, wallet } = provider

  const program = anchor.workspace.Clad as anchor.Program<Clad>
  const programId = program.programId

  const tokenMintAKey = new PublicKey(
    'So11111111111111111111111111111111111111112'
  ) // SOL
  const tokenMintBKey = new PublicKey(
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  ) // USDC

  const feeRate = 500 // bps
  const tickSpacing = 64
  const initSqrtPrice = MathUtil.toX64(new Decimal(5))

  //
  // Create Clad account
  //

  const cladSeeds = [Buffer.from('clad')]

  const [cladKey, cladBump] = PublicKey.findProgramAddressSync(
    cladSeeds,
    programId
  )

  const initializeCladParams = {
    permissions: {
      allowSwap: true,
      allowAddLiquidity: true,
      allowRemoveLiquidity: true,
      allowOpenPosition: true,
      allowClosePosition: true,
    },
    protocolFeeRate: 0,
  }
  const initializeCladAccounts = {
    admin: wallet.publicKey,
    clad: cladKey,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  const txInitializeClad = new TransactionBuilder(
    connection,
    wallet
  ).addInstruction({
    instructions: [
      program.instruction.initializeClad(initializeCladParams, {
        accounts: initializeCladAccounts,
      }),
    ],
    cleanupInstructions: [],
    signers: [],
  })

  const txIdInitializeClad = await txInitializeClad.buildAndExecute()
  console.log(txIdInitializeClad)

  //
  // Create Pool
  //

  const globalpoolSeeds = [
    Buffer.from('globalpool'),
    tokenMintAKey.toBuffer(),
    tokenMintBKey.toBuffer(),
    new anchor.BN(feeRate).toArrayLike(Buffer, 'le', 2),
    new anchor.BN(tickSpacing).toArrayLike(Buffer, 'le', 2),
  ]

  const [globalpoolKey, globalpoolBump] = PublicKey.findProgramAddressSync(
    globalpoolSeeds,
    programId
  )

  const tokenVaultAKeypair = Keypair.generate()
  const tokenVaultBKeypair = Keypair.generate()

  const createPoolParams = {
    feeRate,
    tickSpacing,
    initialSqrtPrice: initSqrtPrice,
  }
  const createPoolAccounts = {
    funder: wallet.publicKey,
    clad: cladKey,
    globalpool: globalpoolKey,
    tokenMintA: tokenMintAKey,
    tokenMintB: tokenMintBKey,
    tokenVaultA: tokenVaultAKeypair.publicKey,
    tokenVaultB: tokenVaultBKeypair.publicKey,
    // sys
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  const txCreatePool = new TransactionBuilder(
    connection,
    wallet
  ).addInstruction({
    instructions: [
      program.instruction.createPool(createPoolParams, {
        accounts: createPoolAccounts,
      }),
    ],
    cleanupInstructions: [],
    signers: [tokenVaultAKeypair, tokenVaultBKeypair],
  })

  const txIdCreatePool = await txCreatePool.buildAndExecute()
  console.log(txIdCreatePool)

  // const { poolInitInfo, configInitInfo, configKeypairs, feeTierParams } =
  //   await initTestPool(ctx, tickSpacing, initSqrtPrice, undefined, reuseTokenA)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
