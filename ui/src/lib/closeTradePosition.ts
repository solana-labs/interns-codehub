import { Program } from '@coral-xyz/anchor'
import { Jupiter, SwapMode } from '@jup-ag/core'
import { Percentage, resolveOrCreateATAs } from '@orca-so/common-sdk'
import { AnchorWallet } from '@solana/wallet-adapter-react'
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createInitializeAccountInstruction,
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
  TransactionInstruction,
  Signer,
  Keypair,
} from '@solana/web3.js'
import BN from 'bn.js'

import { CLAD_PROGRAM_ID, ZERO_BN, testJupiterAmmsToExclude } from '@/constants'
import { Clad } from '@/target/types/clad'
import { GlobalpoolData } from '@/types/accounts'
import { UserTradePosition } from '@/types/user'
import {
  getTickArrayKeyFromTickIndex,
  getTokenAmountsFromLiquidity,
  getRoutesFromJupiter,
} from '@/utils'

export type CloseTradePositionParams = {
  position: UserTradePosition
  positionAuthority: PublicKey
  globalpoolKey: PublicKey
  globalpool: GlobalpoolData
  program: Program<Clad>
  wallet: AnchorWallet
}

const jupiterConnection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET as string)

export async function closeTradePosition(params: CloseTradePositionParams) {
  const {
    position,
    positionAuthority,
    globalpoolKey,
    globalpool,
    program,
    wallet,
  } = params

  const { connection } = program.provider

  const {
    mint: positionMintPubkey,
    key: positionKey,
    data: tradePositionData,
  } = position

  const {
    tickSpacing,
    tickCurrentIndex: currentTickIndex,
    tokenVaultA,
    tokenVaultB,
    tokenMintA: tokenMintAKey,
    tokenMintB: tokenMintBKey,
  } = globalpool

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

  let tokenOwnerAccountA = getAssociatedTokenAddressSync(
    tokenMintAKey,
    positionAuthority,
    true
  )

  let tokenOwnerAccountB = getAssociatedTokenAddressSync(
    tokenMintBKey,
    positionAuthority,
    true
  )

  const tickArrayLowerKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tradePositionData.tickLowerIndex,
    tickSpacing,
    CLAD_PROGRAM_ID
  )

  const tickArrayUpperKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tradePositionData.tickUpperIndex,
    tickSpacing,
    CLAD_PROGRAM_ID
  )

  const currentSqrtPrice = new BN(globalpool.sqrtPrice.toString())
  // MOCK
  // const currentTickIndex = -44224 // 12.00 B/A (USDC/SOL)
  // const currentTickIndex =
  //   Math.round(
  //     (tradePositionData.tickLowerIndex + tradePositionData.tickUpperIndex) /
  //       (2 * tickSpacing)
  //   ) * tickSpacing // mid-point of position's tick range
  // const currentSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(currentTickIndex)

  console.log(`Tick Current: ${currentTickIndex}`)

  const isBorrowA = tokenMintCollateral.equals(globalpool.tokenMintB)
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
      connection: jupiterConnection, // must use mainnet-beta RPC here
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
    if (!swapRoutes || !swapRoutes[0]) return null

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

    if (!bestRoute.marketInfos[0] || !bestRoute.marketInfos[0].amm.label.startsWith('Orca')) {
      throw new Error('Invalid exchange route')
    }

    const swapInstruction = message.instructions.slice(-1)[0]
    if (!swapInstruction) {
      throw new Error('Invalid swap instruction')
    }

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

  const repayTradePositionParams = { swapInstructionData }

  const repayTradePreInstructions: TransactionInstruction[] = []
  const repayTradePostInstructions: TransactionInstruction[] = []
  const repayTradeSigners: Signer[] = []

  // const resolveAtaIxs = await resolveOrCreateATAs(
  //   connection,
  //   positionAuthority,
  //   [{ tokenMint: tokenMintAKey }, { tokenMint: tokenMintBKey }],
  //   () => connection.getMinimumBalanceForRentExemption(AccountLayout.span),
  // )
  // console.log(resolveAtaIxs)

  // const resolveAtaPreIxs = resolveAtaIxs.map((ix) => ix.instructions).flat()
  // console.log('resolveAtaPreIxs', resolveAtaPreIxs)
  // if (resolveAtaPreIxs) repayTradePreInstructions.push(...resolveAtaPreIxs)

  // const resolveAtaPostIxs = resolveAtaIxs.map((ix) => ix.cleanupInstructions).flat()
  // console.log('resolveAtaPostIxs', resolveAtaPostIxs)
  // if (resolveAtaPostIxs) repayTradePostInstructions.push(...resolveAtaPostIxs)

  // const resolveAtaSigners = resolveAtaIxs.map((ix) => ix.signers).flat()
  // console.log('resolveAtaSigners', resolveAtaSigners)
  // if (resolveAtaSigners) repayTradeSigners.push(...resolveAtaSigners)

  //
  // TODO: Dealing with SOL requires creating wrapped NATIVE_MINT account as pre-instruction,
  //       then for post-ixs: unwrapped wSOL to SOL & closing it as post-instruction.
  //

  if (tokenMintAKey.equals(NATIVE_MINT) || tokenMintBKey.equals(NATIVE_MINT)) {
    const newAccountKeypair = Keypair.generate()
    const newAccountPubkey = newAccountKeypair.publicKey
    console.log(newAccountPubkey.toBase58())

    if (tokenMintAKey.equals(NATIVE_MINT)) tokenOwnerAccountA = newAccountPubkey
    else tokenOwnerAccountB = newAccountPubkey

    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: positionAuthority,
      newAccountPubkey,
      lamports: await connection.getMinimumBalanceForRentExemption(AccountLayout.span),
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    })

    const initAccountInstruction = createInitializeAccountInstruction(
      newAccountPubkey,
      NATIVE_MINT,
      positionAuthority
    )

    const instructions: TransactionInstruction[] = [createAccountInstruction, initAccountInstruction]

    const blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
    console.log('blockhash', blockhash)
    const messageV0 = new TransactionMessage({
      payerKey: positionAuthority,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message()

    // repayTradePreInstructions.push(createAccountInstruction, initAccountInstruction)
    // repayTradeSigners.push(newAccountKeypair)
    let transaction = new VersionedTransaction(messageV0)
    transaction.sign([newAccountKeypair])
    transaction = await wallet.signTransaction(transaction)

    await connection.sendTransaction(transaction, { maxRetries: 5, skipPreflight: true })
  }

  // modify compute units (must come last)
  repayTradePreInstructions.push(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_000_000,
    })
  )

  console.log(repayTradePreInstructions)
  console.log(tokenOwnerAccountA.toBase58())

  await program.methods
    .repayTradePosition(repayTradePositionParams)
    .accounts(repayTradePositionAccounts)
    .remainingAccounts(swapAccounts)
    // .preInstructions(repayTradePreInstructions)
    // .postInstructions(repayTradePostInstructions)
    // .signers(repayTradeSigners)
    .rpc()
}