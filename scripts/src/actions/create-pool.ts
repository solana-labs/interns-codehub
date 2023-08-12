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
import { TICK_ARRAY_SIZE, TickUtil } from '@orca-so/whirlpools-sdk'

import { getConstantParams } from '../params'
import { createTransactionChained } from '../utils/txix'
import { initTickArrayRange } from '../utils/tick-arrays'

async function main() {
  const {
    program,
    programId,
    connection,
    provider,
    wallet,
    feeRate,
    tickSpacing,
    tokenMintA,
    tokenMintB,
    cladKey,
    initPrice,
    initSqrtPrice,
    initTickIndex,
  } = await getConstantParams()

  const tokenMintAKey = tokenMintA.address
  const tokenMintBKey = tokenMintB.address

  console.log('Init USDC/HNT Price: ', initPrice.toString())
  console.log('Init USDC/HNT Tick: ', initTickIndex)

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

  const [globalpoolKey] = PublicKey.findProgramAddressSync(
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
    // sys
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  await createTransactionChained(
    connection,
    wallet,
    program.instruction.createPool(createPoolParams, {
      accounts: createPoolAccounts,
    }),
    []
  ).buildAndExecute()

  console.log('Created Pool: ', globalpoolKey.toString())

  //
  // Initialize some tick arrays
  //

  const aToB = false // determines direction of tick array

  const initArrayCount = 17 // 8 to left of, 8 to right of, and 1 array containing current tick
  const currentTickArrayStartIndex = TickUtil.getStartTickIndex(
    initTickIndex,
    tickSpacing
  )

  // reverse direction of `aToB` because `initTickArrayRange` will init in the direction
  // of `aToB` (left if false, right if true)
  const startTickIndex =
    currentTickArrayStartIndex +
    (aToB ? 1 : -1) *
    Math.floor(initArrayCount / 2) *
    tickSpacing *
    TICK_ARRAY_SIZE

  await initTickArrayRange(
    globalpoolKey,
    startTickIndex,
    initArrayCount,
    tickSpacing,
    aToB,
    program,
    provider
  )

  console.log('Initialized some Tick Arrays around the current tick')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
