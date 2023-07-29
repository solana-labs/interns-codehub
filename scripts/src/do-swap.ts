import { Percentage } from '@orca-so/common-sdk'
import { PriceMath } from '@orca-so/whirlpools-sdk'
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token'
import BN from 'bn.js'

import { consoleLogFull, getAccountData, getTokenBalance } from './utils'
import { ParsableGlobalpool, ParsableTickArray } from './types/parsing'
import { getPostPoolInitParams } from './params'
import { TICK_ARRAY_SIZE } from './constants'
import { getTickArrayKeysForSwap } from './utils/tick-arrays'
import { swapQuoteByInputToken } from './utils/swap'
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

  const swapA2B = true // swap A to B (SOL to USDC)
  const swapInputAmount = new BN(50) // x SOL
  const maxSlippage = Percentage.fromFraction(1, 100)

  const globalpoolInfo = await getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )
  if (!globalpoolInfo) {
    throw new Error('globalpool not found')
  }

  const { tokenVaultA, tokenVaultB } = globalpoolInfo

  const tokenMintAKey = mintA.address
  const tokenMintBKey = mintB.address
  const swapInputMint = swapA2B ? mintA : mintB

  console.log(`Token A: ${mintA.address.toBase58()}`)
  console.log(`Token B: ${mintB.address.toBase58()}`)

  const tokenAuthority = provider.wallet.publicKey

  const mintAmount = new BN(100_000) // mint 100k of each token
  const [authorityTokenAccountA, authorityTokenAccountB] =
    await createAndMintToManyATAs(provider, [mintA, mintB], mintAmount)

  // const [authorityTokenAccountA, authorityTokenAccountB] = await Promise.all(
  //   [tokenMintAKey, tokenMintBKey].map((tokenMintKey) =>
  //     getOrCreateAssociatedTokenAccount(
  //       connection,
  //       fundedSigner,
  //       tokenMintKey,
  //       tokenAuthority
  //     ).then((res) => res.address)
  //   )
  // )
  // console.log(authorityTokenAccountA, authorityTokenAccountB)

  const tickArrayKeys = getTickArrayKeysForSwap(
    globalpoolInfo.tickCurrentIndex,
    tickSpacing,
    swapA2B,
    globalpoolKey,
    programId
  )

  //
  // Log tick array data
  //

  console.log(
    `${swapA2B ? 'A' : 'B'} to ${swapA2B ? 'B' : 'A'} tick array keys`
  )

  for (const tickArrayKey of tickArrayKeys) {
    const tickArrayData = await getAccountData(
      tickArrayKey,
      ParsableTickArray,
      connection
    )
    if (!tickArrayData) {
      console.log(tickArrayKey.toBase58().padEnd(16, ' '), '  uninit')
      continue
    }

    const { startTickIndex } = tickArrayData
    const endTickIndex =
      tickArrayData.startTickIndex + tickSpacing * TICK_ARRAY_SIZE

    const startPrice = PriceMath.tickIndexToPrice(
      startTickIndex,
      mintA.decimals,
      mintB.decimals
    ).toFixed(mintB.decimals - 4) // denominated in B (price: x B per 1 A)

    const endPrice = PriceMath.tickIndexToPrice(
      endTickIndex,
      mintA.decimals,
      mintB.decimals
    ).toFixed(mintB.decimals - 4) // denominated in B (price: x B per 1 A)

    console.log(
      tickArrayKey.toBase58().padEnd(16, ' '),
      '    init',
      '  start tick',
      startTickIndex.toString().padStart(8, ' '),
      '  range',
      `[${startPrice}, ${endPrice})`.padEnd(22, '')
    )
  }

  //
  // Swap steps
  //

  const swapInputAmountAdjusted = swapInputAmount.mul(
    new BN(10 ** swapInputMint.decimals)
  )

  const quote = await swapQuoteByInputToken(
    globalpoolKey,
    swapA2B ? tokenMintAKey : tokenMintBKey,
    swapInputAmountAdjusted,
    maxSlippage,
    connection,
    programId
  )

  console.log('Swap quote:')
  console.log(
    `  estimatedAmountIn: ${quote.estimatedAmountIn
      .div(new BN(10 ** mintA.decimals))
      .toLocaleString()}`
  )
  console.log(
    `  estimatedAmountOut: ${quote.estimatedAmountOut
      .div(new BN(10 ** mintB.decimals))
      .toLocaleString()}`
  )
  console.log(`  estimatedEndTickIndex: ${quote.estimatedEndTickIndex}`)
  console.log(`  estimatedEndSqrtPrice: ${quote.estimatedEndSqrtPrice}`)
  console.log(
    `  estimatedFeeAmount: ${quote.estimatedFeeAmount.toLocaleString()}`
  )
  console.log(
    `  amount: ${quote.amount
      // .div(new BN(10 ** mintA.decimals))
      .toLocaleString()}`
  )
  console.log(`  amountSpecifiedIsInput: ${quote.amountSpecifiedIsInput}`)
  console.log(`  aToB: ${quote.aToB}`)
  console.log(
    `  otherAmountThreshold: ${quote.otherAmountThreshold.toLocaleString()}`
  )
  console.log(`  sqrtPriceLimit: ${quote.sqrtPriceLimit}`)
  console.log(`  tickArray0: ${quote.tickArray0.toBase58()}`)
  console.log(`  tickArray1: ${quote.tickArray1.toBase58()}`)
  console.log(`  tickArray2: ${quote.tickArray2.toBase58()}`)

  const authorityTokenAccountABefore = new BN(
    await getTokenBalance(provider, authorityTokenAccountA)
  )
  const authorityTokenAccountBBefore = new BN(
    await getTokenBalance(provider, authorityTokenAccountB)
  )

  const tokenVaultABefore = new BN(await getTokenBalance(provider, tokenVaultA))
  const tokenVaultBBefore = new BN(await getTokenBalance(provider, tokenVaultB))

  console.log('Token A - BEFORE')
  console.log(
    `  Authority: ${authorityTokenAccountABefore
      .div(new BN(10 ** mintA.decimals))
      .toString()}`
  )
  console.log(
    `  Vault:     ${tokenVaultABefore
      .div(new BN(10 ** mintA.decimals))
      .toString()}`
  )
  console.log()
  console.log('Token B - BEFORE')
  console.log(
    `  Authority: ${authorityTokenAccountBBefore
      .div(new BN(10 ** mintB.decimals))
      .toString()}`
  )
  console.log(
    `  Vault:     ${tokenVaultBBefore
      .div(new BN(10 ** mintB.decimals))
      .toString()}`
  )

  const swapAccounts = {
    tokenAuthority,
    globalpool: globalpoolKey,
    tokenOwnerAccountA: authorityTokenAccountA,
    tokenOwnerAccountB: authorityTokenAccountB,
    tokenVaultA,
    tokenVaultB,
    tickArray0: tickArrayKeys[0],
    tickArray1: tickArrayKeys[1],
    tickArray2: tickArrayKeys[2],
    // sys
    tokenProgram: TOKEN_PROGRAM_ID,
  }

  const swapParams = {
    amount: quote.amount,
    otherAmountThreshold: quote.otherAmountThreshold,
    sqrtPriceLimit: quote.sqrtPriceLimit,
    amountSpecifiedIsInput: quote.amountSpecifiedIsInput,
    aToB: quote.aToB,
  }

  await createTransactionChained(
    provider.connection,
    provider.wallet,
    [
      program.instruction.swap(swapParams, {
        accounts: swapAccounts,
      }),
    ],
    []
  ).buildAndExecute()

  const authorityTokenAccountAAfter = new BN(
    await getTokenBalance(provider, authorityTokenAccountA)
  )
  const authorityTokenAccountBAfter = new BN(
    await getTokenBalance(provider, authorityTokenAccountB)
  )

  const tokenVaultAAfter = new BN(await getTokenBalance(provider, tokenVaultA))
  const tokenVaultBAfter = new BN(await getTokenBalance(provider, tokenVaultB))

  console.log('Token A - AFTER')
  console.log(
    `  Authority: ${authorityTokenAccountAAfter
      .div(new BN(10 ** mintA.decimals))
      .toString()}`
  )
  console.log(
    `  Vault:     ${tokenVaultAAfter
      .div(new BN(10 ** mintA.decimals))
      .toString()}`
  )
  console.log()
  console.log('Token B - AFTER')
  console.log(
    `  Authority: ${authorityTokenAccountBAfter
      .div(new BN(10 ** mintB.decimals))
      .toString()}`
  )
  console.log(
    `  Vault:     ${tokenVaultBAfter
      .div(new BN(10 ** mintB.decimals))
      .toString()}`
  )

  const tokenVaultADiff = tokenVaultAAfter.sub(tokenVaultABefore).abs()
  const tokenVaultBDiff = tokenVaultBAfter.sub(tokenVaultBBefore).abs()
  const price = swapA2B
    ? tokenVaultADiff.div(tokenVaultBDiff)
    : tokenVaultBDiff.div(tokenVaultADiff)
  console.log(` Price: ${price.toString()} ${swapA2B ? 'A/B' : 'B/A'}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
