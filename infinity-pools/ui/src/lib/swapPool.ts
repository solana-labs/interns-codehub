import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Percentage, resolveOrCreateATAs } from '@orca-so/common-sdk'
import { AccountLayout, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'
import BN from 'bn.js'

import { Clad } from '@/target/types/clad'
import { getTokenBalance } from '@/utils/token'
import { getTickArrayKeysForSwap } from '@/utils/tick-arrays'
import { swapQuoteByInputToken } from '@/utils/swap'
import { ExpirableGlobalpoolData } from '@/slices/globalpool'
import { ZERO_BN } from '@/constants'

export type SwapPoolParams = {
  tokenAuthority: PublicKey
  swapInputAmount: BN
  swapInputMint: PublicKey
  swapInputMintDecimals: number
  swapOutputMintDecimals: number
  maxSlippage: Percentage
  globalpool: ExpirableGlobalpoolData
  program: Program<Clad>
}

export async function swapPool(params: SwapPoolParams) {
  const {
    swapInputAmount,
    tokenAuthority,
    swapInputMint,
    swapInputMintDecimals,
    swapOutputMintDecimals,
    maxSlippage,
    globalpool,
    program,
  } = params

  const {
    tickSpacing,
    tokenMintA,
    tokenMintB,
    tokenVaultA,
    tokenVaultB,
    tickCurrentIndex,
  } = globalpool
  const globalpoolKey = new PublicKey(globalpool._pubkey)
  const { programId } = program
  const provider = program.provider as AnchorProvider
  const { connection } = provider

  const swapA2B = swapInputMint.equals(tokenMintA)

  const tickArrayKeys = getTickArrayKeysForSwap(
    tickCurrentIndex,
    tickSpacing,
    swapA2B,
    globalpoolKey,
    programId
  )

  const authorityTokenAccountA = getAssociatedTokenAddressSync(
    tokenMintA,
    tokenAuthority,
    true
  )

  const authorityTokenAccountB = getAssociatedTokenAddressSync(
    tokenMintB,
    tokenAuthority,
    true
  )

  const authorityInput = swapA2B ? authorityTokenAccountA : authorityTokenAccountB
  const authorityOutput = swapA2B ? authorityTokenAccountB : authorityTokenAccountA
  const vaultInput = swapA2B ? tokenVaultA : tokenVaultB
  const vaultOutput = swapA2B ? tokenVaultB : tokenVaultA

  //
  // Swap steps
  //

  const swapInputAmountAdjusted = swapInputAmount.mul(new BN(10 ** swapInputMintDecimals))

  const quote = await swapQuoteByInputToken(
    globalpoolKey,
    swapInputMint,
    swapInputAmountAdjusted,
    maxSlippage,
    connection,
    programId
  )

  console.log('Swap quote:')
  console.log(
    `  estimatedAmountIn: ${quote.estimatedAmountIn
      .div(new BN(10 ** swapInputMintDecimals))
      .toLocaleString()}`
  )
  console.log(
    `  estimatedAmountOut: ${quote.estimatedAmountOut
      .div(new BN(10 ** swapOutputMintDecimals))
      .toLocaleString()}`
  )
  console.log(`  estimatedEndTickIndex: ${quote.estimatedEndTickIndex}`)
  console.log(`  estimatedEndSqrtPrice: ${quote.estimatedEndSqrtPrice}`)
  console.log(
    `  estimatedFeeAmount: ${quote.estimatedFeeAmount.toLocaleString()}`
  )
  console.log(
    `  amount: ${quote.amount
      // .div(new BN(10 ** swapInputMintDecimals))
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

  const authorityInputBefore = new BN(await getTokenBalance(provider, authorityInput))
  const authorityOutputBefore = new BN(await getTokenBalance(provider, authorityOutput))
  const vaultInputBefore = new BN(await getTokenBalance(provider, vaultInput))
  const vaultOutputBefore = new BN(await getTokenBalance(provider, vaultOutput))

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

  const swapPreIxs: TransactionInstruction[] = []
  const swapSigners: Signer[] = []

  const resolveAtaIxs = await resolveOrCreateATAs(
    program.provider.connection,
    tokenAuthority,
    [{ tokenMint: tokenMintA }, { tokenMint: tokenMintB }],
    () => program.provider.connection.getMinimumBalanceForRentExemption(AccountLayout.span),
  )
  console.log(resolveAtaIxs)

  const resolveAtaPreIxs = resolveAtaIxs.map((ix) => ix.instructions).flat()
  console.log('resolveAtaPreIxs', resolveAtaPreIxs)
  if (resolveAtaPreIxs) swapPreIxs.push(...resolveAtaPreIxs)

  // const resolveAtaPostIxs = resolveAtaIxs.map((ix) => ix.cleanupInstructions).flat()
  // console.log('resolveAtaPostIxs', resolveAtaPostIxs)
  // if (resolveAtaPostIxs) repayTradePostInstructions.push(...resolveAtaPostIxs)

  const resolveAtaSigners = resolveAtaIxs.map((ix) => ix.signers).flat()
  console.log('resolveAtaSigners', resolveAtaSigners)
  if (resolveAtaSigners) swapSigners.push(...resolveAtaSigners)

  await program.methods
    .swap(swapParams)
    .accounts(swapAccounts)
    .signers(swapSigners)
    .preInstructions(swapPreIxs)
    .rpc()


  const authorityInputAfter = new BN(await getTokenBalance(provider, authorityInput))
  const authorityOutputAfter = new BN(await getTokenBalance(provider, authorityOutput))
  const vaultInputAfter = new BN(await getTokenBalance(provider, vaultInput))
  const vaultOutputAfter = new BN(await getTokenBalance(provider, vaultOutput))

  console.log('Token Input')
  console.log(
    `  Authority BEFORE: ${authorityInputBefore
      .div(new BN(10 ** swapInputMintDecimals))
      .toString()}`
  )
  console.log(
    `  Authority AFTER:  ${authorityInputAfter
      .div(new BN(10 ** swapInputMintDecimals))
      .toString()}`
  )

  console.log(
    `  Vault BEFORE:     ${vaultInputBefore
      .div(new BN(10 ** swapInputMintDecimals))
      .toString()}`
  )
  console.log(
    `  Vault AFTER:      ${vaultInputAfter
      .div(new BN(10 ** swapInputMintDecimals))
      .toString()}`
  )

  console.log()

  console.log('Token B')
  console.log(
    `  Authority BEFORE: ${authorityOutputBefore
      .div(new BN(10 ** swapInputMintDecimals))
      .toString()}`
  )
  console.log(
    `  Authority AFTER:  ${authorityOutputAfter
      .div(new BN(10 ** swapInputMintDecimals))
      .toString()}`
  )

  console.log(
    `  Vault BEFORE:     ${vaultOutputBefore
      .div(new BN(10 ** swapInputMintDecimals))
      .toString()}`
  )
  console.log(
    `  Vault AFTER:      ${vaultOutputAfter
      .div(new BN(10 ** swapInputMintDecimals))
      .toString()}`
  )

  const vaultInputDiff = vaultInputAfter.sub(vaultInputBefore).abs()
  const vaultOutputDiff = vaultOutputAfter.sub(vaultOutputBefore).abs()
  const priceInOut = vaultOutputDiff.gt(ZERO_BN) ? vaultInputDiff.div(vaultOutputDiff) : ZERO_BN
  const priceOutIn = vaultInputDiff.gt(ZERO_BN) ? vaultOutputDiff.div(vaultInputDiff) : ZERO_BN

  console.log(` Price: ${priceInOut.toString()} IN/OUT`)
  console.log(` Price: ${priceOutIn.toString()} OUT/IN`)
}
