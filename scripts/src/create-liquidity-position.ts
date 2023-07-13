import * as anchor from '@coral-xyz/anchor'
import { TickUtil } from '@orca-so/whirlpools-sdk'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js'

import { getConstantParams } from './params'
import { ParsableGlobalpool } from './types/parsing'
import {
  OpenPositionParams,
  OpenLiquidityPositionAccounts,
} from './types/instructions'
import { consoleLogFull, getAccountData } from './utils'
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
    tokenMintAKey,
    tokenMintBKey,
    cladKey,
  } = await getConstantParams()

  const mintAmount = new anchor.BN('15000000000')
  const positionAuthority = wallet.publicKey

  const [authorityTokenAccountA, authorityTokenAccountB] =
    await createAndMintToManyATAs(
      provider,
      [tokenMintAKey, tokenMintBKey],
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

  const { tokenVaultA, tokenVaultB } = globalpoolInfo
  console.log(`Token Vault A: ${tokenVaultA.toBase58()}`)
  console.log(`Token Vault B: ${tokenVaultB.toBase58()}`)

  //
  // Init Tick Array Range
  //

  const startTickIndex = -50688 // -50688, -45056, -39424, -33792, -28160
  const initArrayCount = 5
  const aToB = false

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
    {
      tickLowerIndex: -47872, // -45056 - 44*64
      tickUpperIndex: -42240, // -45056 + 44*64
      liquidityAmount: new anchor.BN(1_000_000),
    },
    // Deposit only Token B (USDC)
    {
      tickLowerIndex: -42240, // -45056 + 44*64
      tickUpperIndex: -39424, // -45056 + 88*64
      liquidityAmount: new anchor.BN(1_000_000),
    },
    // Deposit both Token A and B (SOL & USDC)
    {
      tickLowerIndex: -42240, // -39424 - 44*64
      tickUpperIndex: -36608, // -39424 + 44*64
      liquidityAmount: new anchor.BN(2_000_000),
    },
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

    const increaseLiquidityPositionParams = {
      liquidityAmount: openLiquidityPositionParams.liquidityAmount,
      tokenMaxA: new anchor.BN(1_000_000_000_000_000),
      tokenMaxB: new anchor.BN(1_000_000_000_000_000),
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
