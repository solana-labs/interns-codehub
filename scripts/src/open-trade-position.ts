import { Jupiter } from '@jup-ag/core'
import { Percentage, TransactionBuilder } from '@orca-so/common-sdk'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AccountLayout,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createInitializeAccountInstruction,
  createWrappedNativeAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import {
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Keypair,
  PublicKey,
  Connection,
  ComputeBudgetProgram,
  AccountMeta,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js'
import BN from 'bn.js'

import { JUPITER_PROGRAM_ID, tokenMintSOL, tokenMintUSDC } from './constants'
import envVars from './constants/env-vars'
import { getPostPoolInitParams } from './params'
import { ParsableGlobalpool } from './types/parsing'
import { consoleLogFull, getAccountData, getTokenBalance } from './utils'
import {
  getRouteDataFromJupiterRoutes,
  getRoutesFromJupiter,
} from './utils/jupiter'
import { getTickArrayKeyFromTickIndex } from './utils/tick-arrays'
import { createTransactionChained } from './utils/txix'
import { createAndMintToManyATAs } from './utils/token'

async function main() {
  const {
    provider,
    fundedSigner,
    program,
    programId,
    connection,
    tickSpacing,
    tokenMintA: mintA,
    tokenMintB: mintB,
    cladKey,
    globalpoolKey,
  } = await getPostPoolInitParams()

  console.log(`Clad: ${cladKey.toBase58()}`)
  console.log(`Globalpool: ${globalpoolKey.toBase58()}`)

  const borrowA = false // borrow USDC (B)
  const isTradeA2B = borrowA

  // const borrowAmount = new BN(100 * Math.pow(100, (borrowA ? mintA : mintB).decimals)) // 100 USDC
  const borrowAmount = new BN(1_000_000) // 1m liquidity (todo: calculate using quote)

  const maxSlippage = Percentage.fromFraction(1, 100)
  const maxJupiterPlatformSlippage = 0

  const globalpoolInfo = await getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )
  if (!globalpoolInfo) {
    throw new Error('globalpool not found')
  }

  const { tokenVaultA, tokenVaultB } = globalpoolInfo
  const positionAuthority = provider.wallet.publicKey

  const tokenMintAKey = mintA.address
  const tokenMintBKey = mintB.address

  console.log(`Token A: ${mintA.address.toBase58()}`)
  console.log(`Token B: ${mintB.address.toBase58()}`)

  const mintAmount = new BN(100_000) // mint 100k of each token
  const [tokenOwnerAccountA, tokenOwnerAccountB] =
    await createAndMintToManyATAs(provider, [mintA, mintB], mintAmount)

  // const [tokenOwnerAccountA, tokenOwnerAccountB] = await Promise.all(
  //   [tokenMintAKey, tokenMintBKey].map((tokenMintKey) =>
  //     getOrCreateAssociatedTokenAccount(
  //       connection,
  //       fundedSigner,
  //       tokenMintKey,
  //       tokenAuthority
  //     ).then((res) => res.address)
  //   )
  // )
  // console.log(tokenOwnerAccountA, tokenOwnerAccountB)

  const positionMintKeypair = Keypair.generate()
  const [positionKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('trade_position'), positionMintKeypair.publicKey.toBuffer()],
    programId
  )
  const positionTokenAccount = getAssociatedTokenAddressSync(
    positionMintKeypair.publicKey,
    positionAuthority
  )

  // TODO: programatically find Ticks with enough liquidity for the trade
  const tickLowerIndex = -45056 // globalpoolInfo.tickCurrentIndex - (TICK_ARRAY_SIZE / 4) * tickSpacing
  const tickUpperIndex = -39552 // globalpoolInfo.tickCurrentIndex + tickSpacing

  console.log(`Tick Lower: ${tickLowerIndex}`)
  console.log(`Tick Upper: ${tickUpperIndex}`)
  console.log(`Tick Current: ${globalpoolInfo.tickCurrentIndex}`)

  const tokenVaultABefore = new BN(
    await getTokenBalance(provider, globalpoolInfo.tokenVaultA)
  )
  const tokenVaultBBefore = new BN(
    await getTokenBalance(provider, globalpoolInfo.tokenVaultB)
  )

  console.log(
    'token Vault A before: ',
    tokenVaultABefore.div(new BN(mintA.decimals)).toString()
  )
  console.log(
    'token Vault B before: ',
    tokenVaultBBefore.div(new BN(mintB.decimals)).toString()
  )

  // const quote = await swapQuoteByInputToken(
  //   globalpoolKey,
  //   swapA2B ? tokenMintAKey : tokenMintBKey,
  //   swapInputAmountAdjusted,
  //   maxSlippage,
  //   connection,
  //   programId
  // )

  const tickArrayLowerKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tickLowerIndex,
    tickSpacing,
    programId
  )

  const tickArrayUpperKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tickUpperIndex,
    tickSpacing,
    programId
  )

  const jupiter = await Jupiter.load({
    connection: new Connection(envVars.rpcEndpointMainnetBeta), // must use mainnet-beta RPC here
    cluster: 'mainnet-beta',
    user: positionAuthority,
    wrapUnwrapSOL: false,
    routeCacheDuration: 0,
    // For testing only, only cloned Orca accounts on localnet
    ammsToExclude: {
      // 'Orca (Whirlpools)': false,
      // Orca: false,
      GooseFX: true,
      Phoenix: true,
      'Lifinity V2': true,
      Lifinity: true,
      Symmetry: true,
      Serum: true,
      Openbook: true,
      Mercurial: true,
      Marinade: true,
      Saber: true,
      Raydium: true,
      'Raydium CLMM': true,
    },
  })

  // Gets best route
  const swapRoutes = await getRoutesFromJupiter(
    {
      a2b: isTradeA2B,
      tokenA: tokenMintAKey,
      tokenB: tokenMintBKey,
      // amount: 1 * Math.pow(10, isTradeA2B ? mintA.decimals : mintB.decimals), // 1 usdc or 1 sol
      amount: borrowAmount.toNumber(),
      slippageBps: 30, // 0.3%
      feeBps: 0.0,
    },
    jupiter
  )
  // consoleLogFull(routeInfos)
  // console.log(swapRoutes)
  if (!swapRoutes) return null

  // Routes are sorted based on outputAmount, so ideally the first route is the best.
  const bestRoute = swapRoutes[0]
  // console.log(bestRoute)

  for (const marketInfo of bestRoute.marketInfos) {
    if (marketInfo.notEnoughLiquidity)
      throw new Error('Not enough liquidity on swap venue')
  }

  const res = await jupiter
    .exchange({ routeInfo: bestRoute, userPublicKey: globalpoolKey }) // globalpool trades the tokens
    .catch((err) => {
      console.log('DEBUG: Failed to set exchange')
      console.error(err)
      return null
    })
  if (!res) {
    throw new Error('Skip route with no exchange info')
  }
  const swapTransaction = res.swapTransaction as VersionedTransaction
  if (!swapTransaction.message) {
    throw new Error('Skipped route with no instructions') // skip legacy transaction
  }

  const message = TransactionMessage.decompile(swapTransaction.message, {
    addressLookupTableAccounts: res.addressLookupTableAccounts,
  })
  // console.log(message.instructions)

  console.log('whirlpool data')
  console.log(bestRoute.marketInfos[0].amm)
  if (bestRoute.marketInfos[0].amm.label === 'Orca (Whirlpools)') {
    const { whirlpoolData } = bestRoute.marketInfos[0].amm as unknown as {
      whirlpoolData: {
        whirlpoolsConfig: any
        tokenMintA: any
        tokenMintB: any
        tokenVaultA: any
        tokenVaultB: any
        rewardInfos: any[]
        tickArrays: any[]
      }
    }
    console.log('whirlpoolsConfig', whirlpoolData.whirlpoolsConfig.toBase58())
    console.log('tokenVaultA', whirlpoolData.tokenVaultA.toBase58())
    console.log('tokenVaultB', whirlpoolData.tokenVaultB.toBase58())
    // console.log('config', orcaAmm.whirlpoolsConfig.toBase58())
    // console.log('tokenMintA', orcaAmm.tokenMintA.toBase58())
    // console.log('tokenMintB', orcaAmm.tokenMintB.toBase58())
    // console.log('tokenVaultA', orcaAmm.tokenVaultA.toBase58())
    // console.log('tokenVaultB', orcaAmm.tokenVaultB.toBase58())
    // consoleLogFull(orcaAmm.rewardInfos)
    // consoleLogFull(orcaAmm.tickArrays)
  }

  // const setupInstructions = message.instructions.slice(0, -1)
  // consoleLogFull(setupInstructions)
  // await createTransactionChained(
  //   provider.connection,
  //   provider.wallet,
  //   setupInstructions,
  //   []
  // ).buildAndExecute()

  const swapInstruction = message.instructions.slice(-1)[0]
  // consoleLogFull(swapInstruction)
  // console.log(swapInstruction.programId.toBase58())
  // console.log(swapInstruction.keys.length)

  // Discriminator must equal e5 17 cb 97 7a e3 ad 2a
  // console.log(swapInstruction.data.subarray(0, 8))

  const swapAccounts: AccountMeta[] = [
    {
      isSigner: false,
      isWritable: false,
      pubkey: swapInstruction.programId,
    },
  ]

  for (const key of swapInstruction.keys) {
    if (key.isSigner) {
      if (!key.pubkey.equals(globalpoolKey)) {
        console.log(key.pubkey)
        console.log('DEBUG: Skipped route with unexpected signer')
        continue
      }
      key.isSigner = false
    }
    swapAccounts.push(key)
  }
  console.log('swapAccounts len', swapAccounts.length)

  const openLoanPositionAccounts = {
    owner: positionAuthority,
    globalpool: globalpoolKey,

    position: positionKey,
    positionMint: positionMintKeypair.publicKey,
    positionTokenAccount,

    tokenOwnerAccountA,
    tokenOwnerAccountB,
    tokenVaultA,
    tokenVaultB,
    tokenMintA: tokenMintAKey,
    tokenMintB: tokenMintBKey,

    tickArrayLower: tickArrayLowerKey,
    tickArrayUpper: tickArrayUpperKey,

    // sys
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  const openLoanPositionParams = {
    // amount: quote.amount,
    // otherAmountThreshold: quote.otherAmountThreshold,
    // sqrtPriceLimit: quote.sqrtPriceLimit,
    // amountSpecifiedIsInput: quote.amountSpecifiedIsInput,
    // aToB: quote.aToB,
    liquidityAmount: borrowAmount,
    tickLowerIndex,
    tickUpperIndex,
    borrowA,
  }

  const openTradePositionAccounts = {
    owner: positionAuthority,
    globalpool: globalpoolKey,

    position: positionKey,
    positionTokenAccount,

    tokenOwnerAccountA,
    tokenOwnerAccountB,
    tokenVaultA,
    tokenVaultB,
    tokenMintA: tokenMintAKey,
    tokenMintB: tokenMintBKey,

    // sys
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  const openTradePositionParams = {
    slippageBps: bestRoute.slippageBps,
    platformFeeBps: maxJupiterPlatformSlippage,
    // Swap data
    // swapInAmount: bestRoute.inAmount.toString(),
    // swapOutAmount: bestRoute.outAmount,
    // swapOtherAmountThreshold: bestRoute.otherAmountThreshold.toString(),
    // swapInstructionData: swapInstruction.data,
    swapInstructionData: swapInstruction.data,
  }
  consoleLogFull(openTradePositionParams)

  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_000_000,
  })

  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1,
  })

  const loanTxId = await createTransactionChained(
    provider.connection,
    provider.wallet,
    [
      program.instruction.openLoanPosition(openLoanPositionParams, {
        accounts: openLoanPositionAccounts,
      }),
    ],
    [positionMintKeypair]
  ).buildAndExecute()

  const tradeTxId = await createTransactionChained(
    provider.connection,
    provider.wallet,
    [
      modifyComputeUnits,
      addPriorityFee,
      program.instruction.openTradePosition(openTradePositionParams, {
        accounts: openTradePositionAccounts,
        remainingAccounts: swapAccounts,
      }),
    ],
    []
  ).buildAndExecute()

  console.log(loanTxId, tradeTxId)

  const tokenVaultAAfter = new BN(
    await getTokenBalance(provider, globalpoolInfo.tokenVaultA)
  )
  const tokenVaultBAfter = new BN(
    await getTokenBalance(provider, globalpoolInfo.tokenVaultB)
  )

  console.log(
    'token Vault A after: ',
    tokenVaultAAfter.div(new BN(mintA.decimals)).toString()
  )
  console.log(
    'token Vault B after: ',
    tokenVaultBAfter.div(new BN(mintB.decimals)).toString()
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
