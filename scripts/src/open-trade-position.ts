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
} from '@solana/web3.js'
import BN from 'bn.js'

import { tokenMintSOL, tokenMintUSDC } from './constants'
import envVars from './constants/env-vars'
import { getPostPoolInitParams } from './params'
import { ParsableGlobalpool } from './types/parsing'
import { consoleLogFull, getAccountData, getTokenBalance } from './utils'
import {
  getRemainingAccountsFromJupiterRoutes,
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

  const borrowA = true // borrow SOL
  // const borrowAmount = new BN(1) // 1 SOL
  const borrowAmount = new BN(10_000_000) // 10k liquidity (TODO: use quote to get this)

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
  })

  const routeInfos = await getRoutesFromJupiter(
    {
      a2b: true, // token a to token b
      tokenA: tokenMintSOL,
      tokenB: tokenMintUSDC,
      amount: 100 * Math.pow(10, 6),
      slippageBps: 5.0,
      feeBps: 0.0,
    },
    jupiter
  )
  // consoleLogFull(routeInfos)
  if (!routeInfos) return null

  const remainingAccounts = await getRemainingAccountsFromJupiterRoutes(
    routeInfos,
    jupiter,
    provider,
    positionAuthority
  )
  console.log('remainingAccounts')
  consoleLogFull(remainingAccounts)
  if (!remainingAccounts) return null

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
    liquidityAmount: borrowAmount,
    tickLowerIndex,
    tickUpperIndex,
    borrowA,
    slippageBps: parseFloat(maxSlippage.toString()),
    platformFeeBps: maxJupiterPlatformSlippage,
  }

  const txId = await createTransactionChained(
    provider.connection,
    provider.wallet,
    [
      program.instruction.openTradePosition(openTradePositionParams, {
        accounts: openTradePositionAccounts,
        remainingAccounts,
      }),
    ],
    [positionMintKeypair]
  ).buildAndExecute()

  console.log(txId)

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
