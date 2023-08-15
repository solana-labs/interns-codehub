import * as anchor from '@coral-xyz/anchor'
import { DecimalUtil, Percentage } from '@orca-so/common-sdk'
import { PriceMath, TickUtil } from '@orca-so/whirlpools-sdk'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js'
import Decimal from 'decimal.js'

import { TICK_ARRAY_SIZE } from '../constants'
import { getPostPoolInitParams } from '../params'
import { ParsableGlobalpool } from '../types/parsing'
import {
  OpenPositionParams,
  OpenLiquidityPositionAccounts,
} from '../types/instructions'
import { getAccountData, priceToTickIndex } from '../utils'
import { increaseLiquidityQuoteByInputToken } from '../utils/liquidity-position/quote'
import { PositionStatus } from '../utils/liquidity-position/types'
import { PositionUtil } from '../utils/liquidity-position/utils'
import { createAndMintToManyATAs } from '../utils/token'
import { createTransactionChained } from '../utils/txix'
import { getTickArrayKeyFromTickIndex } from '../utils/tick-arrays'

async function main() {
  const {
    provider,
    program,
    programId,
    connection,
    wallet,
    feeRate,
    tickSpacing,
    tokenMintA,
    tokenMintB,
    cladKey,
  } = await getPostPoolInitParams()

  const mintAmount = new anchor.BN(100_000) // 100k of each tokens
  const positionAuthority = wallet.publicKey

  const tokenMintAKey = tokenMintA.address
  const tokenMintBKey = tokenMintB.address

  const [authorityTokenAccountA, authorityTokenAccountB] =
    await createAndMintToManyATAs(
      provider,
      [tokenMintA, tokenMintB],
      mintAmount,
      positionAuthority
    )

  const globalpoolSeeds = [
    Buffer.from('globalpool'),
    tokenMintAKey.toBuffer(),
    tokenMintBKey.toBuffer(),
    new anchor.BN(feeRate).toArrayLike(Buffer, 'le', 2),
    new anchor.BN(tickSpacing).toArrayLike(Buffer, 'le', 2),
  ]

  const [globalpoolKey] = PublicKey.findProgramAddressSync(
    globalpoolSeeds,
    programId
  )

  console.log(`Clad: ${cladKey.toBase58()}`)
  console.log(`Globalpool: ${globalpoolKey.toBase58()}`)

  const globalpoolInfo = await getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )

  if (!globalpoolInfo) {
    throw new Error('Globalpool not found')
  }

  const { tokenVaultA, tokenVaultB, tickCurrentIndex } = globalpoolInfo
  console.log(`Token Vault A: ${tokenVaultA.toBase58()}`)
  console.log(`Token Vault B: ${tokenVaultB.toBase58()}`)

  //
  // Create Liquidity Position
  //

  // Deposit both Token A and B (X & USDC)
  const preparedLiquiditiyPositions: OpenPositionParams[] = [
    // {
    //   tickLowerIndex: tickCurrentIndex,
    //   tickUpperIndex: tickCurrentIndex + (TICK_ARRAY_SIZE / 2) * tickSpacing,
    //   liquidityAmount: new anchor.BN(1000), // 1000 X
    // },
    // {
    //   tickLowerIndex: tickCurrentIndex - (TICK_ARRAY_SIZE / 2) * tickSpacing,
    //   tickUpperIndex: tickCurrentIndex,
    //   liquidityAmount: new anchor.BN(1000), // 1000 USDC
    // },
    // {
    //   tickLowerIndex: tickCurrentIndex - (TICK_ARRAY_SIZE) * tickSpacing,
    //   tickUpperIndex: tickCurrentIndex - 2 * tickSpacing,
    //   liquidityAmount: new anchor.BN(1000), // 1000 USDC
    // },
    // {
    //   tickLowerIndex: tickCurrentIndex - (TICK_ARRAY_SIZE / 4) * tickSpacing,
    //   tickUpperIndex: tickCurrentIndex + tickSpacing,
    //   liquidityAmount: new anchor.BN(1000), // 1000 X worth
    // },
  ]

  const additional = [[1.8, 1.9], [1.7, 1.8], [1.6, 1.8], [1.6, 2.2], [1.9, 2.3]]
  for (const [lower, upper] of additional) {
    preparedLiquiditiyPositions.push({
      tickLowerIndex: priceToTickIndex(lower, tickSpacing, tokenMintA.decimals, tokenMintB.decimals),
      tickUpperIndex: priceToTickIndex(upper, tickSpacing, tokenMintA.decimals, tokenMintB.decimals),
      liquidityAmount: new anchor.BN(10_000), // 10k X worth
    })
  }

  const defaultOpenLiquidityPositionAccounts: Omit<
    OpenLiquidityPositionAccounts,
    'position' | 'positionMint' | 'positionTokenAccount'
  > = {
    positionAuthority: positionAuthority,
    globalpool: globalpoolKey,
    tokenMintA: tokenMintAKey,
    tokenMintB: tokenMintBKey,
    tokenVaultA: tokenVaultA,
    tokenVaultB: tokenVaultB,
    // sys
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  const res: { [key: string]: OpenLiquidityPositionAccounts } = {}
  for (const openLiquidityPositionParams of preparedLiquiditiyPositions) {
    const { tickLowerIndex, tickUpperIndex, liquidityAmount } =
      openLiquidityPositionParams

    const positionMintKeypair = Keypair.generate()
    const [positionKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('liquidity_position'),
        positionMintKeypair.publicKey.toBuffer(),
      ],
      programId
    )
    const positionTokenAccount = getAssociatedTokenAddressSync(
      positionMintKeypair.publicKey,
      positionAuthority
    )

    const openLiquidityPositionAccounts: OpenLiquidityPositionAccounts = {
      position: positionKey,
      positionMint: positionMintKeypair.publicKey,
      positionTokenAccount,
      ...defaultOpenLiquidityPositionAccounts,
    }

    const positionStatus = PositionUtil.getPositionStatus(
      tickCurrentIndex,
      tickLowerIndex,
      tickUpperIndex
    )
    const inputTokenMint =
      positionStatus === PositionStatus.AboveRange ? tokenMintB : tokenMintA

    const quote = increaseLiquidityQuoteByInputToken(
      globalpoolInfo,
      inputTokenMint,
      new Decimal(liquidityAmount.toString()),
      tickLowerIndex,
      tickUpperIndex,
      Percentage.fromFraction(10, 100) // (10/100)% slippage
    )

    const increaseLiquidityPositionParams = {
      liquidityAmount: quote.liquidityAmount,
      tokenMaxA: quote.tokenMaxA,
      tokenMaxB: quote.tokenMaxB,
    }

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

    const increaseLiquidityPositionAccounts = {
      positionAuthority,
      globalpool: globalpoolKey,
      position: positionKey,
      positionTokenAccount,
      tokenOwnerAccountA: authorityTokenAccountA,
      tokenOwnerAccountB: authorityTokenAccountB,
      tokenVaultA,
      tokenVaultB,
      tickArrayLower: tickArrayLowerKey,
      tickArrayUpper: tickArrayUpperKey,
      // sys
      tokenProgram: TOKEN_PROGRAM_ID,
    }

    const txId = await createTransactionChained(
      provider.connection,
      provider.wallet,
      [
        program.instruction.openLiquidityPosition(openLiquidityPositionParams, {
          accounts: openLiquidityPositionAccounts,
        }),
        program.instruction.increaseLiquidity(increaseLiquidityPositionParams, {
          accounts: increaseLiquidityPositionAccounts,
        }),
      ],
      [positionMintKeypair]
    ).buildAndExecute()

    res[txId] = openLiquidityPositionAccounts

    console.log(`txId: ${txId}`)
    console.log('position:', positionKey.toString())
    console.log('position mint:', positionMintKeypair.publicKey.toString())
    console.log(`tick range [${tickLowerIndex}, ${tickUpperIndex})`)
    console.log(
      'tokenA max input',
      DecimalUtil.fromBN(quote.tokenMaxA, tokenMintA.decimals).toString()
    )
    console.log(
      'tokenB max input',
      DecimalUtil.fromBN(quote.tokenMaxB, tokenMintB.decimals).toString()
    )
    console.log('liquidity', quote.liquidityAmount.toString())
  }

  // consoleLogFull(res)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
