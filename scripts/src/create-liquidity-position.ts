import * as anchor from '@coral-xyz/anchor'
import { DecimalUtil, Percentage } from '@orca-so/common-sdk'
import { TickUtil } from '@orca-so/whirlpools-sdk'
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

import { TICK_ARRAY_SIZE } from './constants'
import { getConstantParams } from './params'
import { ParsableGlobalpool } from './types/parsing'
import {
  OpenPositionParams,
  OpenLiquidityPositionAccounts,
} from './types/instructions'
import { consoleLogFull, getAccountData } from './utils'
import { increaseLiquidityQuoteByInputToken } from './utils/liquidity-position/quote'
import { PositionStatus } from './utils/liquidity-position/types'
import { PositionUtil } from './utils/liquidity-position/utils'
import { createAndMintToManyATAs } from './utils/token'
import { createTransactionChained } from './utils/txix'
import { initTickArrayRange } from './utils/tick-arrays'

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
  } = await getConstantParams()

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
  // Init Tick Array Range
  //

  const aToB = false // determines direction of tick array

  const initArrayCount = 7 // 3 to left of, 3 to right of, and 1 array containing current tick
  const currentTickArrayStartIndex = TickUtil.getStartTickIndex(
    tickCurrentIndex,
    tickSpacing
  )

  // reverse direction of `aToB` because `initTickArrayRange` will init in the direction
  // of `aToB` (left if false, right if true)
  const startTickIndex =
    currentTickArrayStartIndex +
    (aToB ? 1 : -1) *
      Math.floor(initArrayCount / 2) *
      tickSpacing *
      TICK_ARRAY_SIZE

  await initTickArrayRange(
    globalpoolKey,
    startTickIndex,
    initArrayCount,
    tickSpacing,
    aToB,
    program,
    provider
  )

  //
  // Create Liquidity Position
  //

  // positions to create
  const preparedLiquiditiyPositions: OpenPositionParams[] = [
    // Deposit only Token A (SOL)
    // {
    //   tickLowerIndex: tickCurrentIndex,
    //   tickUpperIndex: tickCurrentIndex + (TICK_ARRAY_SIZE/2) * tickSpacing,
    //   liquidityAmount: new anchor.BN(100), // 100 SOL
    // },
    // Deposit only Token B (USDC)
    {
      tickLowerIndex: tickCurrentIndex - (TICK_ARRAY_SIZE / 2) * tickSpacing,
      tickUpperIndex: tickCurrentIndex,
      liquidityAmount: new anchor.BN(100), // 100 USDC
    },
    {
      tickLowerIndex: tickCurrentIndex - (TICK_ARRAY_SIZE / 4) * tickSpacing,
      tickUpperIndex: tickCurrentIndex + 64,
      liquidityAmount: new anchor.BN(100), // 100 USDC
    },
    {
      tickLowerIndex: tickCurrentIndex - (TICK_ARRAY_SIZE) * tickSpacing,
      tickUpperIndex: tickCurrentIndex - 128,
      liquidityAmount: new anchor.BN(100), // 100 USDC
    },
    // // Deposit both Token A and B (SOL & USDC)
    // {
    //   tickLowerIndex: tickCurrentIndex - Math.floor(TICK_ARRAY_SIZE/3) * tickSpacing,
    //   tickUpperIndex: tickCurrentIndex + Math.ceil(TICK_ARRAY_SIZE/3) * tickSpacing,
    //   liquidityAmount: new anchor.BN(100), // 100 SOL worth of both
    // },
  ]

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
    // console.log(openLiquidityPositionAccounts)

    const { tickLowerIndex, tickUpperIndex, liquidityAmount } =
      openLiquidityPositionParams

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
      Percentage.fromFraction(5, 100) // 0.05% slippage
    )

    console.log(
      'tokenA max input',
      DecimalUtil.fromBN(quote.tokenMaxA, tokenMintA.decimals).toString()
    )
    console.log(
      'tokenB max input',
      DecimalUtil.fromBN(quote.tokenMaxB, tokenMintB.decimals).toString()
    )
    console.log('liquidity', quote.liquidityAmount.toString())

    const increaseLiquidityPositionParams = {
      liquidityAmount: quote.liquidityAmount,
      tokenMaxA: quote.tokenMaxA,
      tokenMaxB: quote.tokenMaxB,
    }

    const [tickArrayLowerKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('tick_array'),
        globalpoolKey.toBuffer(),
        Buffer.from(
          TickUtil.getStartTickIndex(
            openLiquidityPositionParams.tickLowerIndex,
            tickSpacing
          ).toString()
        ),
      ],
      programId
    )

    const [tickArrayUpperKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('tick_array'),
        globalpoolKey.toBuffer(),
        Buffer.from(
          TickUtil.getStartTickIndex(
            openLiquidityPositionParams.tickUpperIndex,
            tickSpacing
          ).toString()
        ),
      ],
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
  }

  consoleLogFull(res)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
