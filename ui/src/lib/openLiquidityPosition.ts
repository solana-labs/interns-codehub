import { Program } from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token'
import {
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  PublicKey,
  Keypair,
} from '@solana/web3.js'
import { DecimalUtil, Percentage } from '@orca-so/common-sdk'
import BN from 'bn.js'
import Decimal from 'decimal.js'

import { CLAD_PROGRAM_ID } from '@/constants'
import { ExpirableGlobalpoolData } from '@/slices/globalpool'
import { Clad } from '@/target/types/clad'
import { getTickArrayKeyFromTickIndex } from '@/utils'
import { PositionUtil } from '@/utils/liquidity-position/utils'
import { increaseLiquidityQuoteByInputToken } from '@/utils/liquidity-position/quote'
import { PositionStatus } from '@/utils/liquidity-position/types'

export type OpenLiquidityPositionParams = {
  tickLowerIndex: number,
  tickUpperIndex: number,
  liquidityAmount: BN,
  positionAuthority: PublicKey
  globalpool: ExpirableGlobalpoolData
  program: Program<Clad>
}

export async function openLiquidityPosition(params: OpenLiquidityPositionParams) {
  const {
    tickLowerIndex,
    tickUpperIndex,
    positionAuthority,
    liquidityAmount,
    globalpool,
    program,
  } = params

  const globalpoolKey = new PublicKey(globalpool._pubkey)
  const { connection } = program.provider

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
    [Buffer.from('liquidity_position'), positionMintKeypair.publicKey.toBuffer()],
    CLAD_PROGRAM_ID
  )
  const positionTokenAccount = getAssociatedTokenAddressSync(
    positionMintKeypair.publicKey,
    positionAuthority
  )

  const [tokenMintA, tokenMintB] = await Promise.all([
    getMint(connection, tokenMintAKey),
    getMint(connection, tokenMintBKey)
  ])

  const authorityTokenAccountA = getAssociatedTokenAddressSync(
    tokenMintAKey,
    positionAuthority,
    true
  )

  const authorityTokenAccountB = getAssociatedTokenAddressSync(
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

  const positionStatus = PositionUtil.getPositionStatus(
    tickCurrentIndex,
    tickLowerIndex,
    tickUpperIndex
  )
  const inputTokenMint =
    positionStatus === PositionStatus.AboveRange ? tokenMintB : tokenMintA

  const quote = increaseLiquidityQuoteByInputToken(
    globalpool,
    inputTokenMint,
    new Decimal(liquidityAmount.toString()),
    tickLowerIndex,
    tickUpperIndex,
    Percentage.fromFraction(10, 100) // (10/100)% slippage
  )

  console.log(quote)

  console.log(
    'tokenA max input',
    DecimalUtil.fromBN(quote.tokenMaxA, tokenMintA.decimals).toString()
  )
  console.log(
    'tokenB max input',
    DecimalUtil.fromBN(quote.tokenMaxB, tokenMintB.decimals).toString()
  )
  console.log('liquidity', quote.liquidityAmount.toString())

  const openLiquidityPositionAccounts = {
    positionAuthority: positionAuthority,
    globalpool: globalpoolKey,

    position: positionKey,
    positionMint: positionMintKeypair.publicKey,
    positionTokenAccount,

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

  const openLiquidityPositionParams = {
    liquidityAmount,
    tickLowerIndex,
    tickUpperIndex,
  }

  const increaseLiquidityPositionParams = {
    liquidityAmount: quote.liquidityAmount,
    tokenMaxA: quote.tokenMaxA,
    tokenMaxB: quote.tokenMaxB,
  }

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

  await program.methods
    .openLiquidityPosition(openLiquidityPositionParams)
    .accounts(openLiquidityPositionAccounts)
    .signers([positionMintKeypair])
    .rpc()

  await program.methods
    .increaseLiquidity(increaseLiquidityPositionParams)
    .accounts(increaseLiquidityPositionAccounts)
    .rpc()
}
