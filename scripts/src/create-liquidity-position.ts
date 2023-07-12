import * as anchor from '@coral-xyz/anchor'
import { MathUtil, Percentage, TransactionBuilder } from '@orca-so/common-sdk'
import { ASSOCIATED_TOKEN_PROGRAM_ID, Mint, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js'
import * as assert from 'assert'
import Decimal from 'decimal.js'

import { Clad } from '@/target/types/clad'
import { ParsableGlobalpool } from './types/parsing'
import { consoleLogFull, getAccountData } from './utils'

const TICK_ARRAY_SIZE = 88

type PDA = {
  publicKey: PublicKey
  bump: number
}

type InitTickArrayParams = {
  globalpool: PublicKey
  tickArray: PublicKey // tickArrayPda: PDA
  startTick: number
  // funder: PublicKey;
}

type FundedPositionParams = {
  tickLowerIndex: number
  tickUpperIndex: number
  liquidityAmount: anchor.BN
}

type OpenLiquidityPositionAccounts = {
	positionAuthority: PublicKey,
	globalpool: PublicKey,
	tokenMintA: PublicKey,
	tokenMintB: PublicKey,
	tokenVaultA: PublicKey,
	tokenVaultB: PublicKey,
	position: PublicKey,
	positionMint: PublicKey,
	positionTokenAccount: PublicKey,
	associatedTokenProgram: PublicKey,
	tokenProgram: PublicKey,
	systemProgram: PublicKey,
	rent: PublicKey,
}

async function initTickArray(
  globalpool: PublicKey,
  startTickIndex: number,
  program: anchor.Program<Clad>,
  provider: anchor.AnchorProvider
  // funder?: Keypair,
): Promise<{ txId: string; params: InitTickArrayParams }> {
  const [tickArrayKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('tick_array'),
      globalpool.toBuffer(),
      Buffer.from(startTickIndex.toString()),
    ],
    program.programId
  )

  const initializeTickArrayParams = {
    startTickIndex,
  }
  const initializeTickArrayAccounts = {
    funder: provider.wallet.publicKey,
    globalpool,
    tickArray: tickArrayKey,
    systemProgram: SystemProgram.programId,
  }

  const tx = new TransactionBuilder(
    provider.connection,
    provider.wallet
  ).addInstruction({
    instructions: [
      program.instruction.initializeTickArray(initializeTickArrayParams, {
        accounts: initializeTickArrayAccounts,
      }),
    ],
    cleanupInstructions: [],
    signers: [],
  })
  // if (funder) tx.addSigner(funder);

  return {
    txId: await tx.buildAndExecute(),
    params: { globalpool, tickArray: tickArrayKey, startTick: startTickIndex },
  }
}

async function initTickArrayRange(
  globalpool: PublicKey,
  startTickIndex: number,
  arrayCount: number,
  tickSpacing: number,
  aToB: boolean,
  program: anchor.Program<Clad>,
  provider: anchor.AnchorProvider
): Promise<PublicKey[]> {
  const ticksInArray = tickSpacing * TICK_ARRAY_SIZE
  const direction = aToB ? -1 : 1

  // TODO: Use Promise.all
  return Promise.all(
    [...Array(arrayCount).keys()].map(async (i) => {
      try {
        const { params } = await initTickArray(
          globalpool,
          startTickIndex + direction * ticksInArray * i,
          program,
          provider
        )
        return params.tickArray
      } catch (err) {
        throw err
      }
    })
  )
}

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

  const { tokenVaultA, tokenVaultB } =
    await getAccountData(globalpoolKey, ParsableGlobalpool, connection)

  //
  // Init Tick Array Range
  //

  const startTickIndex = 0
  const arrayCount = 3
  const aToB = false

  // await initTickArrayRange(
  //   globalpoolKey,
  //   startTickIndex,
  //   arrayCount,
  //   tickSpacing,
  //   aToB,
  //   program,
  //   provider
  // )

  // positions to create
  const preparedLiquiditiyPositions: FundedPositionParams[] = [
    {
      liquidityAmount: new anchor.BN(100_000),
      tickLowerIndex: -2816, // 88*64 = 5632
      tickUpperIndex: 2816,
    },
  ]

  // await fundPositions(
  //   ctx,
  //   poolInitInfo,
  //   tokenAccountA,
  //   tokenAccountB,
  //   fundParams
  // )

  //
  // Create Liquidity Position
  //

	const positionAuthority = wallet.publicKey
  const defaultOpenLiquidityPositionAccounts: Omit<OpenLiquidityPositionAccounts, 'position' | 'positionMint' | 'positionTokenAccount'> = {
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

	console.log(defaultOpenLiquidityPositionAccounts)

	const res: { [key: string]: OpenLiquidityPositionAccounts } = {}
	for (const openLiquidityPositionParams of preparedLiquiditiyPositions) {
		const positionMintKeypair = Keypair.generate();
		const [positionKey] = PublicKey.findProgramAddressSync([positionMintKeypair.publicKey.toBuffer()], programId)
		const positionTokenAccount = getAssociatedTokenAddressSync(positionMintKeypair.publicKey, positionAuthority)

		let openLiquidityPositionAccounts: OpenLiquidityPositionAccounts = {
			position: positionKey,
			positionMint: positionMintKeypair.publicKey,
			positionTokenAccount,
			...defaultOpenLiquidityPositionAccounts,
		}

		const tx = new TransactionBuilder(
			provider.connection,
			provider.wallet,
			{
				defaultBuildOption: {
					maxSupportedTransactionVersion: 2,
					blockhashCommitment: 'finalized',
				},
				defaultSendOption: {},
				defaultConfirmationCommitment: 'processed'
			}
		).addInstruction({
			instructions: [
				program.instruction.openLiquidityPosition(openLiquidityPositionParams, {
					accounts: openLiquidityPositionAccounts,
				}),
			],
			cleanupInstructions: [],
			signers: [positionMintKeypair],
		})

		const txId = await tx.buildAndExecute()
		res[txId] = openLiquidityPositionAccounts
	}

	consoleLogFull(res)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
