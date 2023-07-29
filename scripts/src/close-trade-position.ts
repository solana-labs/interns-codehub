import { Jupiter } from '@jup-ag/core'
import { Percentage } from '@orca-so/common-sdk'
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

import envVars from './constants/env-vars'
import { getPostPoolInitParams } from './params'
import { ParsableGlobalpool } from './types/parsing'
import { consoleLogFull, getAccountData, getTokenBalance } from './utils'
import { getRoutesFromJupiter } from './utils/jupiter'
import { getTickArrayKeyFromTickIndex } from './utils/tick-arrays'
import { createTransactionChained } from './utils/txix'
import { createAndMintToManyATAs } from './utils/token'
import { PoolUtil, toTokenAmount } from '@orca-so/whirlpools-sdk'

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
    tokenOracleA,
    tokenOracleB,
    cladKey,
    globalpoolKey,
  } = await getPostPoolInitParams()

  console.log(`Clad: ${cladKey.toBase58()}`)
  console.log(`Globalpool: ${globalpoolKey.toBase58()}`)

  const positionMintPubkey = new PublicKey(
    '4oZpNCAMCzw48wJyWqkBXwMuHrVVW94ygxM2yKzZphzc'
  )

  const borrowA = false // borrow USDC (B)
  const isTradeA2B = borrowA // swap USDC (B) to SOL (A)

  // const borrowAmount = new BN(100 * Math.pow(100, (borrowA ? mintA : mintB).decimals)) // 100 USDC
  const borrowAmount = 100 // 100 USDC
  const borrowAmountExpo = borrowAmount * Math.pow(10, mintB.decimals) // above scaled to decimal exponent

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

  const [positionKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('trade_position'), positionMintPubkey.toBuffer()],
    programId
  )
  const positionTokenAccount = getAssociatedTokenAddressSync(
    positionMintPubkey,
    positionAuthority
  )

  // TODO: programatically find Ticks with enough liquidity for the trade
  const tickLowerIndex = -45056 // globalpoolInfo.tickCurrentIndex - (TICK_ARRAY_SIZE / 4) * tickSpacing
  const tickUpperIndex = -39552 // globalpoolInfo.tickCurrentIndex + tickSpacing

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
      slippageBps: 30, // 0.3%
      feeBps: 0.0,
    },
    jupiter
  )
  if (!swapRoutes) return null

  // Routes are sorted based on outputAmount, so ideally the first route is the best.
  const bestRoute = swapRoutes[0]

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
  } else if (bestRoute.marketInfos[0].amm.label !== 'Orca') {
    throw new Error(
      `Invalid exchange route, ${bestRoute.marketInfos[0].amm.label}`
    )
  }

  const swapInstruction = message.instructions.slice(-1)[0]

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

  const repayTradePositionAccounts = {
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

  const repayTradePositionParams = {
    slippageBps: bestRoute.slippageBps,
    platformFeeBps: maxJupiterPlatformSlippage,
    // Swap data
    // swapInAmount: bestRoute.inAmount.toString(),
    // swapOutAmount: bestRoute.outAmount,
    // swapOtherAmountThreshold: bestRoute.otherAmountThreshold.toString(),
    // swapInstructionData: swapInstruction.data,
    swapInstructionData: swapInstruction.data,
  }

  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_000_000,
  })

  await createTransactionChained(
    provider.connection,
    provider.wallet,
    [
      modifyComputeUnits,
      program.instruction.repayTradePosition(repayTradePositionParams, {
        accounts: repayTradePositionAccounts,
        remainingAccounts: swapAccounts,
      }),
    ],
    []
  ).buildAndExecute()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
