import { Program } from '@coral-xyz/anchor'
import { Jupiter } from '@jup-ag/core'
import {
  AccountLayout,
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
  TransactionInstruction,
  Signer,
} from '@solana/web3.js'
import BN from 'bn.js'

import { CLAD_PROGRAM_ID, testJupiterAmmsToExclude } from '@/constants'
import { Clad } from '@/target/types/clad'
import { GlobalpoolData } from '@/types/accounts'
import {
  getTickArrayKeyFromTickIndex,
  getRoutesFromJupiter,
  estimateLiquidityFromTokenAmounts,
  toTokenAmount,
} from '@/utils'
import { resolveOrCreateATAs } from '@orca-so/common-sdk'

export type OpenTradePositionParams = {
  tickLowerIndex: number,
  tickUpperIndex: number,
  borrowAmount: number, // token amounts to borrow (either Token A or B; not liquidity amount)
  borrowTokenDecimals: number, // decimal exponent of borrow token
  loanDuration: number, // loan duration in seconds
  positionAuthority: PublicKey
  globalpoolKey: PublicKey
  globalpool: GlobalpoolData
  program: Program<Clad>
}

const jupiterConnection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET as string)

export default async function openTradePosition(params: OpenTradePositionParams) {
  const {
    tickLowerIndex,
    tickUpperIndex,
    borrowAmount,
    borrowTokenDecimals,
    loanDuration,
    positionAuthority,
    globalpoolKey,
    globalpool,
    program,
  } = params

  if (tickLowerIndex >= tickUpperIndex) {
    throw new Error('Invalid lower tick index')
  }

  const {
    tickSpacing,
    tickCurrentIndex,
    tokenVaultA,
    tokenVaultB,
    tokenMintA: tokenMintAKey,
    tokenMintB: tokenMintBKey,
  } = globalpool


  const positionMintKeypair = Keypair.generate()

  const [positionKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('trade_position'), positionMintKeypair.publicKey.toBuffer()],
    CLAD_PROGRAM_ID
  )
  const positionTokenAccount = getAssociatedTokenAddressSync(
    positionMintKeypair.publicKey,
    positionAuthority
  )

  const tokenOwnerAccountA = getAssociatedTokenAddressSync(
    tokenMintAKey,
    positionAuthority,
    true
  )

  const tokenOwnerAccountB = getAssociatedTokenAddressSync(
    tokenMintBKey,
    positionAuthority,
    true
  )

  const tickArrayLowerKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tickLowerIndex,
    tickSpacing,
    CLAD_PROGRAM_ID
  )

  const tickArrayUpperKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tickUpperIndex,
    tickSpacing,
    CLAD_PROGRAM_ID
  )

  let isBorrowA: boolean
  if (tickUpperIndex < tickCurrentIndex) {
    isBorrowA = false
  } else if (tickLowerIndex > tickCurrentIndex) {
    isBorrowA = true
  } else {
    throw new Error('Invalid lower and upper tick index, must be either both above or below current tick index')
  }

  const borrowAmountExpo = borrowAmount * Math.pow(10, borrowTokenDecimals) // borrow amount scaled to decimal exponent

  const borrowAmountLiquidity = estimateLiquidityFromTokenAmounts(
    tickCurrentIndex,
    tickLowerIndex,
    tickUpperIndex,
    toTokenAmount(
      isBorrowA ? borrowAmountExpo : 0,
      isBorrowA ? 0 : borrowAmountExpo
    )
  )

  //
  // Swap setup
  //

  const jupiter = await Jupiter.load({
    connection: jupiterConnection,
    cluster: 'mainnet-beta',
    user: positionAuthority,
    wrapUnwrapSOL: false,
    routeCacheDuration: 0,
    ammsToExclude: testJupiterAmmsToExclude
  })

  // Gets best route
  const swapRoutes = await getRoutesFromJupiter(
    {
      a2b: isBorrowA, // If borrowing A, trade borrrowed A => B and vice versa.
      tokenA: tokenMintAKey,
      tokenB: tokenMintBKey,
      amount: borrowAmountExpo, // input token amount scaled to decimal exponent (& NOT in liquidity amount)
      slippageBps: 30, // 0.3%
      feeBps: 0.0,
    },
    jupiter
  )

  if (!swapRoutes) return null

  // Routes are sorted based on outputAmount, so ideally the first route is the best.
  const bestRoute = swapRoutes[0]
  if (!bestRoute) throw new Error('No best route found')

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

  if (!bestRoute || !bestRoute.marketInfos[0]) {
    throw new Error('Invalid exchange route')
  }

  if (!bestRoute.marketInfos[0].amm.label.startsWith('Orca')) {
    throw new Error(
      `Invalid exchange route, ${bestRoute.marketInfos[0].amm.label}`
    )
  }

  const swapInstruction = message.instructions.slice(-1)[0]
  if (!swapInstruction) throw new Error('No swap instruction found')

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
    borrowA: isBorrowA,
    loanDuration: new BN(loanDuration),
    swapInstructionData: swapInstruction.data,
  }

  const openTradePositionPreIxs: TransactionInstruction[] = []
  const openTradePositionSigners: Signer[] = []

  const resolveAtaIxs = await resolveOrCreateATAs(
    program.provider.connection,
    positionAuthority,
    [{ tokenMint: tokenMintAKey }, { tokenMint: tokenMintBKey }],
    () => program.provider.connection.getMinimumBalanceForRentExemption(AccountLayout.span),
  )
  console.log(resolveAtaIxs)

  const resolveAtaPreIxs = resolveAtaIxs.map((ix) => ix.instructions).flat()
  console.log('resolveAtaPreIxs', resolveAtaPreIxs)
  if (resolveAtaPreIxs) openTradePositionPreIxs.push(...resolveAtaPreIxs)

  // const resolveAtaPostIxs = resolveAtaIxs.map((ix) => ix.cleanupInstructions).flat()
  // console.log('resolveAtaPostIxs', resolveAtaPostIxs)
  // if (resolveAtaPostIxs) repayTradePostInstructions.push(...resolveAtaPostIxs)

  const resolveAtaSigners = resolveAtaIxs.map((ix) => ix.signers).flat()
  console.log('resolveAtaSigners', resolveAtaSigners)
  if (resolveAtaSigners) openTradePositionSigners.push(...resolveAtaSigners)

  openTradePositionPreIxs.push(ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_000_000,
  }))

  await program.methods
    .openTradePosition(openTradePositionParams)
    .accounts(openTradePositionAccounts)
    .remainingAccounts(swapAccounts)
    .signers([positionMintKeypair, ...openTradePositionSigners])
    .preInstructions(openTradePositionPreIxs)
    .rpc()
}