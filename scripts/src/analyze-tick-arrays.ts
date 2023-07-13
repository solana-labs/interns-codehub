import * as anchor from '@coral-xyz/anchor'
import { MathUtil, Percentage, TransactionBuilder } from '@orca-so/common-sdk'
import { getMint, Mint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js'
import * as assert from 'assert'
import Decimal from 'decimal.js'

import { Clad } from '@/target/types/clad'
import { consoleLogFull, getAccountData, getTokenBalance } from './utils'
import { ParsableGlobalpool, ParsableTickArray } from './types/parsing'
import { PriceMath, TickUtil } from '@orca-so/whirlpools-sdk'

const TICK_ARRAY_SIZE = 88

async function main() {
  const provider = anchor.AnchorProvider.local('http://127.0.0.1:8899', {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  const { connection, wallet } = provider

  const program = anchor.workspace.Clad as anchor.Program<Clad>
  const programId = program.programId

  const [cladKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('clad')],
    programId
  )

  const tokenMintAKey = new PublicKey(
    'So11111111111111111111111111111111111111112'
  ) // SOL
  const tokenMintBKey = new PublicKey(
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  ) // USDC

  const feeRate = 500 // bps
  const tickSpacing = 64

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

  // const tokenVaultABefore = new anchor.BN(
  //   await getTokenBalance(provider, globalpoolInfo.tokenVaultA)
  // );
  // const tokenVaultBBefore = new anchor.BN(
  //   await getTokenBalance(provider, globalpoolInfo.tokenVaultB)
  // );

  // consoleLogFull(globalpoolInfo)

  // console.log('tokenVaultABefore', tokenVaultABefore)
  // console.log('tokenVaultBBefore', tokenVaultBBefore)

  const mintA = await getMint(connection, globalpoolInfo.tokenMintA)
  const mintB = await getMint(connection, globalpoolInfo.tokenMintB)

  type TickArrayInfo = {
    tickArrayKey: PublicKey
    startTickIndex: number
    startPrice: Decimal
    endPrice: Decimal
    isCurrent: boolean
    isInitialized: boolean
  }

  const neighboringTickArrayInfos: TickArrayInfo[] = []
  for (let offset = -6; offset <= +6; offset++) {
    const startTickIndex = TickUtil.getStartTickIndex(
      globalpoolInfo.tickCurrentIndex,
      tickSpacing,
      offset
    )

    const [tickArrayKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('tick_array'),
        globalpoolKey.toBuffer(),
        Buffer.from(startTickIndex.toString()),
      ],
      programId
    )
    //  PDAUtil.getTickArray(programId, whirlpoolPubkey, startTickIndex);

    const endTickIndex = startTickIndex + tickSpacing * TICK_ARRAY_SIZE

    const startPrice = PriceMath.tickIndexToPrice(
      startTickIndex,
      mintA.decimals,
      mintB.decimals
    )

    const endPrice = PriceMath.tickIndexToPrice(
      endTickIndex,
      mintA.decimals,
      mintB.decimals
    )

    let tickArrayData
    try {
      tickArrayData = await getAccountData(tickArrayKey, ParsableTickArray, connection)
    } catch (err) {
      tickArrayData = null
    }

    neighboringTickArrayInfos.push({
      tickArrayKey,
      startTickIndex,
      startPrice,
      endPrice,
      isCurrent: offset == 0,
      isInitialized: !!tickArrayData, // if tickArrayData is not null, then the tick array is initialized
    })
  }

  console.log('neighring tickarrays...')
  neighboringTickArrayInfos.forEach((ta) =>
    console.log(
      ta.isCurrent ? '>>' : '  ',
      ta.tickArrayKey.toBase58().padEnd(45, ' '),
      ta.isInitialized ? '    initialized' : 'NOT INITIALIZED',
      'start tick',
      ta.startTickIndex.toString().padStart(10, ' '),
      'covered range',
      ta.startPrice.toFixed(mintB.decimals),
      '-',
      ta.endPrice.toFixed(mintB.decimals)
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
