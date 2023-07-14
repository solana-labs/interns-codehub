import * as anchor from '@coral-xyz/anchor'
import { TransactionBuilder } from '@orca-so/common-sdk'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js'

import { getConstantParams } from './params'
import { createTransactionChained } from './utils/txix'

async function main() {
  const {
    program,
    programId,
    connection,
    wallet,
    feeRate,
    tickSpacing,
    tokenMintA,
    tokenMintB,
    cladKey,
    initPrice,
    initSqrtPrice,
  } = await getConstantParams()

  const tokenMintAKey = tokenMintA.address
  const tokenMintBKey = tokenMintB.address

  console.log('Init B/A Price: ', initPrice.toString())

  //
  // Create Clad account
  //

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
  console.log('Initialized Clad: ', txIdInitializeClad)

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

  const txIdCreatePool = await createTransactionChained(
    connection,
    wallet,
    program.instruction.createPool(createPoolParams, {
      accounts: createPoolAccounts,
    }),
    [tokenVaultAKeypair, tokenVaultBKeypair]
  ).buildAndExecute()

  console.log('Created Pool: ', txIdCreatePool)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
