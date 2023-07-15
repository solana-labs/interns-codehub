import { Percentage } from '@orca-so/common-sdk'
import { PriceMath } from '@orca-so/whirlpools-sdk'
import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import BN from 'bn.js'
import Decimal from 'decimal.js'

import { consoleLogFull, getAccountData, getTokenBalance } from './utils'
import { ParsableGlobalpool, ParsableTickArray } from './types/parsing'
import { getPostPoolInitParams } from './params'
import { TICK_ARRAY_SIZE } from './constants'
import { getTickArrayKeysForSwap } from './utils/tick-arrays'
import { swapQuoteByInputToken } from './utils/swap'
import { createTransactionChained } from './utils/txix'
import { createAssociatedTokenAccount } from './utils/token'

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
    keypair,
  } = await getPostPoolInitParams()

  console.log(`Clad: ${cladKey.toBase58()}`)
  console.log(`Globalpool: ${globalpoolKey.toBase58()}`)

  const swapA2B = true // swap A to B (SOL to USDC)
  const swapInputAmount = new BN(1) // 1 SOL
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

  const authorityTokenAccountA = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    tokenMintAKey,
    tokenAuthority
  )
  
  const authorityTokenAccountB = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    tokenMintBKey,
    tokenAuthority
  )

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

  console.log(quote)

  const tokenVaultABefore = new BN(
    await getTokenBalance(provider, authorityTokenAccountA.address)
  )
  const tokenVaultBBefore = new BN(
    await getTokenBalance(provider, authorityTokenAccountB.address)
  )

  console.log(
    'token Vault A before: ',
    tokenVaultABefore.div(new BN(10 ** 6)).toString()
  )
  console.log(
    'token Vault B before: ',
    tokenVaultBBefore.div(new BN(10 ** 6)).toString()
  )

  const swapAccounts = {
    tokenAuthority,
    globalpool: globalpoolKey,
    tokenOwnerAccountA: authorityTokenAccountA.address,
    tokenOwnerAccountB: authorityTokenAccountB.address,
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

  const txId = await createTransactionChained(
    provider.connection,
    provider.wallet,
    [
      program.instruction.swap(swapParams, {
        accounts: swapAccounts,
      }),
    ],
    []
  ).buildAndExecute()

  console.log(txId)

  const tokenVaultAAfter = new BN(
    await getTokenBalance(provider, authorityTokenAccountA.address)
  )
  const tokenVaultBAfter = new BN(
    await getTokenBalance(provider, authorityTokenAccountB.address)
  )

  console.log(
    'token Vault A after: ',
    tokenVaultAAfter.div(new BN(10 ** 6)).toString()
  )
  console.log(
    'token Vault B after: ',
    tokenVaultBAfter.div(new BN(10 ** 6)).toString()
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
