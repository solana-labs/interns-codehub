import * as anchor from '@coral-xyz/anchor'
import { TransactionBuilder } from '@orca-so/common-sdk'
import { PriceMath, TICK_ARRAY_SIZE, TickUtil } from '@orca-so/whirlpools-sdk'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import {
  Connection,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js'
import Decimal from 'decimal.js'

import { Clad } from '../constants'
import { getConstantParams } from '../params'
import poolConfigs from '../pool-config.json'
import { ParsableGlobalpool } from '../types/parsing'
import { getAccountData } from '../utils'
import { getPythPrices } from '../utils/pyth'
import { createTransactionChained } from '../utils/txix'
import { initTickArrayRange } from '../utils/tick-arrays'

async function createPools(connection: Connection, program: anchor.Program<Clad>, wallet: anchor.Wallet, provider: anchor.AnchorProvider, cladKey: PublicKey) {
  const symbolSets = new Set<string>()

  Object.values(poolConfigs).map((poolConfig) => {
    symbolSets.add(poolConfig.baseToken.symbol)
    symbolSets.add(poolConfig.quoteToken.symbol)
  })

  const prices = await getPythPrices([...symbolSets])

  const initPromises = Object.values(poolConfigs).map(async (poolConfig) => {
    const tokenMintAKey = new PublicKey(poolConfig.baseToken.address)
    const tokenMintBKey = new PublicKey(poolConfig.quoteToken.address)

    // const tokenMintA = await getMint(connection, tokenMintAKey)
    // const tokenMintB = await getMint(connection, tokenMintBKey)

    const decimalsA = poolConfig.baseToken.decimals
    const decimalsB = poolConfig.quoteToken.decimals

    const tokenPriceA = prices[poolConfig.baseToken.symbol]
    const tokenPriceB = prices[poolConfig.quoteToken.symbol]

    if (!tokenPriceA || !tokenPriceB) {
      console.error(`Token price not found for ${poolConfig.baseToken.symbol} or ${poolConfig.quoteToken.symbol}`)
      return
    }

    const desiredStartPrice = new Decimal(tokenPriceA).div(tokenPriceB)
    const tickSpacing = poolConfig.tickSpacing
    const feeRate = poolConfig.feeRate

    const initTickIndex = PriceMath.priceToTickIndex(desiredStartPrice, decimalsA, decimalsB) // Math.round((Math.log(desiredStartPrice * Math.pow(10, decimalDiff)) / Math.log(1.0001)) / tickSpacing) * tickSpacing
    const initPrice = PriceMath.tickIndexToPrice(initTickIndex, decimalsA, decimalsB)
    const initSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(initTickIndex)

    const globalpoolSeeds = [
      Buffer.from('globalpool'),
      tokenMintAKey.toBuffer(),
      tokenMintBKey.toBuffer(),
      new anchor.BN(feeRate).toArrayLike(Buffer, 'le', 2),
      new anchor.BN(tickSpacing).toArrayLike(Buffer, 'le', 2),
    ]

    const [globalpoolKey] = PublicKey.findProgramAddressSync(
      globalpoolSeeds,
      program.programId
    )

    const globalpoolInfo = await getAccountData(globalpoolKey, ParsableGlobalpool, connection)
    if (globalpoolInfo) {
      console.log(`Globalpool ${globalpoolKey.toBase58()} already exists`)
      return
    }

    const tokenVaultA = getAssociatedTokenAddressSync(tokenMintAKey, globalpoolKey, true)
    const tokenVaultB = getAssociatedTokenAddressSync(tokenMintBKey, globalpoolKey, true)

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
    console.log('   Base:  ', poolConfig.baseToken.symbol)
    console.log('   Quote: ', poolConfig.quoteToken.symbol)
    console.log('   Fee Rate:      ', feeRate)
    console.log('   Tick Spacing:  ', tickSpacing)
    console.log('   Initial Price: ', initPrice)
    console.log('   Initial Tick:  ', initTickIndex)

    await initializePoolTicks(globalpoolKey, initTickIndex, tickSpacing, program, provider)

    return Promise.resolve(true)
  })

  await Promise.all(initPromises)
}

async function initializePoolTicks(globalpoolKey: PublicKey, initTickIndex: number, tickSpacing: number, program: anchor.Program<Clad>, provider: anchor.AnchorProvider) {
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

async function main() {
  const {
    program,
    connection,
    provider,
    wallet,
    cladKey,
  } = await getConstantParams()

  //
  // Create Clad account
  //

  const cladAccountInfo = await connection.getAccountInfo(cladKey)

  if (!cladAccountInfo) {
    const initCladParams = {
      permissions: {
        allowSwap: true,
        allowAddLiquidity: true,
        allowRemoveLiquidity: true,
        allowOpenPosition: true,
        allowClosePosition: true,
      },
      protocolFeeRate: 0,
    }
    const initCladAccounts = {
      admin: wallet.publicKey,
      clad: cladKey,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    }

    const initCladTx = new TransactionBuilder(connection, wallet)
      .addInstruction({
        instructions: [
          program.instruction.initializeClad(initCladParams, {
            accounts: initCladAccounts,
          }),
        ],
        cleanupInstructions: [],
        signers: [],
      })

    await initCladTx.buildAndExecute()

    console.log('Initialized Clad: ', cladKey.toBase58())
  } else {
    console.log('Clad already exists: ', cladKey.toBase58())
  }

  //
  // Create Pools & initialize some tick arrays
  //
  await createPools(connection, program, wallet as anchor.Wallet, provider, cladKey)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
