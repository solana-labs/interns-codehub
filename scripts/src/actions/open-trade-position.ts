import { Jupiter } from '@jup-ag/core'
import { Percentage } from '@orca-so/common-sdk'
import { PoolUtil, toTokenAmount } from '@orca-so/whirlpools-sdk'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
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
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js'
import BN from 'bn.js'

import envVars from '../constants/env-vars'
import { getPostPoolInitParams } from '../params'
import { ParsableGlobalpool } from '../types/parsing'
import { consoleLogFull, getAccountData, getTokenBalance } from '../utils'
import { getRoutesFromJupiter } from '../utils/jupiter'
import { getTickArrayKeyFromTickIndex } from '../utils/tick-arrays'
import { createTransactionChained } from '../utils/txix'
import { createAndMintToManyATAs } from '../utils/token'

async function main() {
  const {
    provider,
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
  const isTradeA2B = borrowA // swap USDC (B) to SOL (A)

  // const borrowAmount = new BN(100 * Math.pow(100, (borrowA ? mintA : mintB).decimals)) // 100 USDC
  const borrowAmount = 25 // 100 USDC
  const borrowAmountExpo = borrowAmount * Math.pow(10, mintB.decimals) // above scaled to decimal exponent

  const maxSlippage = Percentage.fromFraction(50, 100) // (50/100)% slippage
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
  console.log('secretKey')
  console.log(positionMintKeypair.secretKey)
  const [positionKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('trade_position'), positionMintKeypair.publicKey.toBuffer()],
    programId
  )
  const positionTokenAccount = getAssociatedTokenAddressSync(
    positionMintKeypair.publicKey,
    positionAuthority
  )

  // TODO: programatically find Ticks with enough liquidity for the trade
  // const tickLowerIndex = -39104 // 20.03 USDC/SOL
  // const tickUpperIndex = -37696 // 23.06 USDC/SOL

  // RUN: ANCHOR_WALLET=~/.config/solana/id.json ts-node src/analyze-ticks.ts
  // and find the ticks with enough liquidity_gross
  const tickLowerIndex = -39616 // 1.90 USDC/HNT
  const tickUpperIndex = -39104 // 2.00 USDC/HNT

  // NOTE: At the top end of the price range, tick calcuation is off therefore the results can be off
  const borrowAmountLiquidity = PoolUtil.estimateLiquidityFromTokenAmounts(
    globalpoolInfo.tickCurrentIndex,
    tickLowerIndex,
    tickUpperIndex,
    toTokenAmount(
      borrowA ? borrowAmountExpo : 0,
      borrowA ? 0 : borrowAmountExpo
    )
  )

  console.log(`Tick Lower: ${tickLowerIndex}`)
  console.log(`Tick Upper: ${tickUpperIndex}`)
  console.log(`Tick Current: ${globalpoolInfo.tickCurrentIndex}`)
  console.log(`borrowAmount: ${borrowAmount.toString()}`)
  console.log(`borrowAmountLiquidity: ${borrowAmountLiquidity.toString()}`)

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

  //
  // Swap setup
  //

  const jupiter = await Jupiter.load({
    connection: new Connection(envVars.rpcEndpointMainnetBeta), // must use mainnet-beta RPC here
    cluster: 'mainnet-beta',
    user: positionAuthority,
    wrapUnwrapSOL: false,
    routeCacheDuration: 0,
    // For testing only, only cloned Orca accounts on localnet
    ammsToExclude: {
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
    },
  })

  // Gets best route
  const swapRoutes = await getRoutesFromJupiter(
    {
      a2b: isTradeA2B,
      tokenA: tokenMintAKey,
      tokenB: tokenMintBKey,
      // amount: 1 * Math.pow(10, isTradeA2B ? mintA.decimals : mintB.decimals), // 1 usdc or 1 sol
      amount: borrowAmountExpo, // input token amount scaled to decimal exponent (& NOT in liquidity amount)
      slippageBps: parseFloat(maxSlippage.toString()),
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

  //
  // For test only, fix the route's whirlpool data pubkeys for tick arrays
  //

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
        rewardInfos: any
        tickArrays: any
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
      ; (
        bestRoute.marketInfos[0].amm as unknown as {
          whirlpoolData: { tickArrays: any }
        }
      ).whirlpoolData.tickArrays = {
        aToB: [
          new PublicKey('4QcvZfw9oLWTBZbLUM6fZ4LZm2E398QEKmyKBsqfBPSQ'),
          new PublicKey('8LGqqS5P6kFy6LGYSVr5byaqVXcaqWh2PAUjmGzut4zM'),
          new PublicKey('C6ZMoA93UfQMsJm2khN2gQr6vyTpujXFiLLxG3VeLEp6'),
        ],
        bToA: [
          new PublicKey('4QcvZfw9oLWTBZbLUM6fZ4LZm2E398QEKmyKBsqfBPSQ'),
          new PublicKey('FUifo3d4gzAyE4k9ZZjKWmBhfHskCiVF4S9QgsGyjJVD'),
          new PublicKey('HamuvLZt4pM1DBikuiF1hpnmK1EX9yLv9BUotHUJMBvp'),
        ],
      }
  } else if (bestRoute.marketInfos[0].amm.label !== 'Orca') {
    throw new Error(
      `Invalid exchange route, ${bestRoute.marketInfos[0].amm.label}`
    )
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
    // Jupiter Program ID hard-coded in the program, BUT we still need the program ID as the first account
    // because Jupiter's `route` requires the first account be the program ID.
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

  const openTradePositionAccounts = {
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

  const openTradePositionParams = {
    // amount: quote.amount,
    // otherAmountThreshold: quote.otherAmountThreshold,
    // sqrtPriceLimit: quote.sqrtPriceLimit,
    // amountSpecifiedIsInput: quote.amountSpecifiedIsInput,
    // aToB: quote.aToB,
    liquidityAmount: borrowAmountLiquidity, // borrow amount in liquidity amount format
    tickLowerIndex,
    tickUpperIndex,
    borrowA,
    loanDuration: new BN(3600), // min is 1 hour
    swapInstructionData: swapInstruction.data,
  }

  consoleLogFull(openTradePositionParams)

  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_000_000,
  })

  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1,
  })

  await createTransactionChained(
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
    [positionMintKeypair]
  ).buildAndExecute()

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
