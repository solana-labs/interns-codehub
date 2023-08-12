import { Jupiter, SwapMode } from '@jup-ag/core'
import { Percentage } from '@orca-so/common-sdk'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import {
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  PublicKey,
  Connection,
  ComputeBudgetProgram,
  AccountMeta,
  VersionedTransaction,
  TransactionMessage,
  Keypair,
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
import { getUserTradePositions } from '../utils/position'
import { getTokenAmountsFromLiquidity } from '../utils/token-math'
import { ZERO_BN, testJupiterAmmsToExclude } from '../constants'

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
  console.log(`Token A Vault: ${tokenVaultA.toBase58()}`)
  console.log(`Token B Vault: ${tokenVaultB.toBase58()}`)

  const mintAmount = new BN(100_000) // mint 100k of each token
  const [tokenOwnerAccountA, tokenOwnerAccountB] =
    await createAndMintToManyATAs(provider, [mintA, mintB], mintAmount)

  const tradePosition = (
    await getUserTradePositions(positionAuthority, connection, programId)
  )[0]

  const {
    mint: positionMintPubkey,
    key: positionKey,
    data: tradePositionData,
  } = tradePosition

  const {
    collateralAmount,
    liquidityBorrowed,
    loanTokenSwapped,
    tradeTokenAmount,
    tokenMintCollateral,
  } = tradePositionData

  const positionTokenAccount = getAssociatedTokenAddressSync(
    positionMintPubkey,
    positionAuthority
  )

  const tickArrayLowerKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tradePositionData.tickLowerIndex,
    tickSpacing,
    programId
  )

  const tickArrayUpperKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tradePositionData.tickUpperIndex,
    tickSpacing,
    programId
  )

  const currentTickIndex = globalpoolInfo.tickCurrentIndex
  const currentSqrtPrice = new BN(globalpoolInfo.sqrtPrice.toString())
  // MOCK
  // const currentTickIndex = -44224 // 12.00 B/A (USDC/SOL)
  // const currentTickIndex =
  //   Math.round(
  //     (tradePositionData.tickLowerIndex + tradePositionData.tickUpperIndex) /
  //       (2 * tickSpacing)
  //   ) * tickSpacing // mid-point of position's tick range
  // const currentSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(currentTickIndex)

  console.log(`Tick Current: ${currentTickIndex}`)

  const isBorrowA = tokenMintCollateral.equals(globalpoolInfo.tokenMintB)
  // isBorrowA = true  => prev borrowed A & swapped to B, so now swap B to A & repay A
  // isBorrowA = false => prev borrowed B & swapped to A, so now swap A to B & repay B

  const { tokenA: repayTokenA, tokenB: repayTokenB } =
    getTokenAmountsFromLiquidity(
      liquidityBorrowed,
      currentSqrtPrice,
      tradePositionData.tickLowerIndex,
      tradePositionData.tickUpperIndex,
      true
    )

  const borrowedDeltaA = isBorrowA ? loanTokenSwapped : ZERO_BN
  const borrowedDeltaB = isBorrowA ? ZERO_BN : loanTokenSwapped
  const availableDeltaA = isBorrowA
    ? ZERO_BN
    : tradeTokenAmount.add(collateralAmount)
  const availableDeltaB = isBorrowA
    ? tradeTokenAmount.add(collateralAmount)
    : ZERO_BN
  const swapNeededDeltaA = new BN(
    Math.max(0, repayTokenA.sub(availableDeltaA).toNumber())
  )
  const swapNeededDeltaB = new BN(
    Math.max(0, repayTokenB.sub(availableDeltaB).toNumber())
  )

  console.log('repayTokenA', repayTokenA.toString())
  console.log('borrowedDeltaA', borrowedDeltaA.toString())
  console.log('availableDeltaA', availableDeltaA.toString())
  console.log('swapNeededDeltaA', swapNeededDeltaA.toString())
  console.log('repayTokenB', repayTokenB.toString())
  console.log('borrowedDeltaB', borrowedDeltaB.toString())
  console.log('availableDeltaB', availableDeltaB.toString())
  console.log('swapNeededDeltaB', swapNeededDeltaB.toString())

  if (swapNeededDeltaA.isZero() && swapNeededDeltaB.isZero()) {
    console.log('No swap needed')
  } else if (!swapNeededDeltaA.isZero() && !swapNeededDeltaB.isZero()) {
    throw Error('Invalid repayment amount, both token A & B needed')
  }

  let isSwapTradeA2B = false // true in else-if below
  let swapInTokenVault: PublicKey | undefined = undefined
  let swapOutTokenVault: PublicKey | undefined = undefined
  let swapOutNeeded: BN = ZERO_BN

  if (swapNeededDeltaA.gt(ZERO_BN)) {
    console.log('Need more A. Swap B to A')
    // isSwapTradeA2B = false
    swapInTokenVault = tokenVaultB
    swapOutTokenVault = tokenVaultA
    swapOutNeeded = swapNeededDeltaA
  } else if (swapNeededDeltaB.gt(ZERO_BN)) {
    console.log('Need more B. Swap A to B')
    isSwapTradeA2B = true
    swapInTokenVault = tokenVaultA
    swapOutTokenVault = tokenVaultB
    swapOutNeeded = swapNeededDeltaB
  }

  let swapInstructionData = Buffer.alloc(0) // default empty
  let swapAccounts = [] as AccountMeta[]

  if (swapInTokenVault && swapOutTokenVault) {
    //
    // Swap setup
    //

    const jupiter = await Jupiter.load({
      connection: new Connection(envVars.rpcEndpointMainnetBeta), // must use mainnet-beta RPC here
      cluster: 'mainnet-beta',
      user: globalpoolKey,
      wrapUnwrapSOL: false,
      routeCacheDuration: 0,
      // For testing only, only cloned Orca accounts on localnet
      ammsToExclude: testJupiterAmmsToExclude,
    })

    console.log('swapOutNeeded', swapOutNeeded.toString())

    // Gets best route
    const swapRoutes = await getRoutesFromJupiter(
      {
        a2b: isSwapTradeA2B,
        tokenA: tokenMintAKey,
        tokenB: tokenMintBKey,
        amount: swapOutNeeded.toNumber(), // input token amount scaled to decimal exponent (& NOT in liquidity amount)
        slippageBps: 100, // 1%
        feeBps: 0.0,
        swapMode: SwapMode.ExactOut,
      },
      jupiter
    )
    if (!swapRoutes) return null

    // Routes are sorted based on outputAmount, so ideally the first route is the best.
    const bestRoute = swapRoutes[0]

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

    if (!bestRoute.marketInfos[0].amm.label.startsWith('Orca')) {
      throw new Error(
        `Invalid exchange route, ${bestRoute.marketInfos[0].amm.label}`
      )
    }

    const swapInstruction = message.instructions.slice(-1)[0]

    swapAccounts = [
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

    swapInstructionData = swapInstruction.data
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
    swapInstructionData,
    // lower & upper tick index are retrieved from the position
  }

  const closeTradePositionAccounts = {
    owner: positionAuthority,
    receiver: positionAuthority,
    globalpool: globalpoolKey,

    position: positionKey,
    positionMint: positionMintPubkey,
    positionTokenAccount,

    tokenOwnerAccountA,
    tokenOwnerAccountB,
    tokenVaultA,
    tokenVaultB,
    tokenMintA: tokenMintAKey,
    tokenMintB: tokenMintBKey,

    tickArrayLower: tickArrayLowerKey,
    tickArrayUpper: tickArrayUpperKey,

    tokenProgram: TOKEN_PROGRAM_ID,
    // associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    // systemProgram: SystemProgram.programId,
    // rent: SYSVAR_RENT_PUBKEY,
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

  console.log(closeTradePositionAccounts)

  await createTransactionChained(
    provider.connection,
    provider.wallet,
    [
      program.instruction.closeTradePosition({
        accounts: closeTradePositionAccounts,
      }),
    ],
    [] // positionMintKeypair
  ).buildAndExecute()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
