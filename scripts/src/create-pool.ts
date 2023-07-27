import * as anchor from '@coral-xyz/anchor'
import { TransactionBuilder } from '@orca-so/common-sdk'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
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
    tokenOracleA,
    tokenOracleB,
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

  const tokenVaultA = getAssociatedTokenAddressSync(
    tokenMintAKey,
    globalpoolKey,
    true
  )
  const tokenVaultB = getAssociatedTokenAddressSync(
    tokenMintBKey,
    globalpoolKey,
    true
  )
  // const tokenVaultA = await createAndMintToAssociatedTokenAccount(
  //   provider,
  //   tokenMintA,
  //   0,
  //   globalpoolKey,
  // )
  // const tokenVaultB = await createAndMintToAssociatedTokenAccount(
  //   provider,
  //   tokenMintB,
  //   0,
  //   globalpoolKey,
  // )

  const createPoolParams = {
    feeRate,
    tickSpacing,
    initialSqrtPrice: initSqrtPrice,
  }
  const createPoolAccounts = {
    funder: wallet.publicKey,
    clad: cladKey,
    globalpool: globalpoolKey,
    tokenMintA: tokenMintA.address,
    tokenMintB: tokenMintB.address,
    tokenVaultA: tokenVaultA,
    tokenVaultB: tokenVaultB,
    tokenPriceFeedA: tokenOracleA,
    tokenPriceFeedB: tokenOracleB,
    // sys
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  const txIdCreatePool = await createTransactionChained(
    connection,
    wallet,
    program.instruction.createPool(createPoolParams, {
      accounts: createPoolAccounts,
    }),
    []
  ).buildAndExecute()

  console.log('Created Pool: ', txIdCreatePool)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
