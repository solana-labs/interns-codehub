import * as anchor from '@coral-xyz/anchor'
import { PriceMath } from '@orca-so/whirlpools-sdk'
import { getMint } from '@solana/spl-token'
import { Keypair, PublicKey } from '@solana/web3.js'

import { Clad } from '@/target/types/clad'
import {
  pythOracleSOL,
  pythOracleUSDC,
  tokenMintBONK,
  tokenMintHNT,
  tokenMintSOL,
  tokenMintUSDC,
} from './constants'
import { requestAirdrop } from './utils/token'

export function getPDA(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, programId)[0]
}

export async function getConstantParams() {
  // const dummyWallet = new DummyWallet()
  // const provider = new anchor.AnchorProvider(
  //   new Connection('http://127.0.0.1:8899'),
  //   dummyWallet,
  //   {
  //     commitment: 'confirmed',
  //     preflightCommitment: 'confirmed',
  //   }
  // )
  const provider = anchor.AnchorProvider.local('http://127.0.0.1:8899', {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })

  const { connection, wallet } = provider

  const program = anchor.workspace.Clad as anchor.Program<Clad>
  const programId = program.programId

  const fundedSigner = Keypair.generate()

  // airdrop SOL
  if ((await connection.getBalance(fundedSigner.publicKey)) === 0) {
    await requestAirdrop(provider, { receiver: fundedSigner.publicKey })
  }

  const tickSpacing = 64
  const feeRate = 3000 // per 1_000_000 (3000 => 0.3%)

  // const tokenMintAKey = tokenMintSOL
  const tokenMintAKey = tokenMintHNT
  const tokenMintBKey = tokenMintUSDC

  const tokenMintA = await getMint(connection, tokenMintAKey)
  const tokenMintB = await getMint(connection, tokenMintBKey)

  const tokenOracleA = pythOracleSOL
  const tokenOracleB = pythOracleUSDC

  const desiredStartPrice = 2.149 // B/A (USDC/HNT)

  const decimalDiff = tokenMintB.decimals - tokenMintA.decimals
  const initTickIndex = Math.round((Math.log(desiredStartPrice * Math.pow(10, decimalDiff)) / Math.log(1.0001)) / tickSpacing) * tickSpacing
  const initPrice = PriceMath.tickIndexToPrice(
    initTickIndex,
    tokenMintA.decimals,
    tokenMintB.decimals
  )
  const initSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(initTickIndex)

  const [cladKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('clad')],
    programId
  )

  return {
    provider,
    fundedSigner,
    program,
    programId,
    connection,
    wallet,
    feeRate,
    tickSpacing,
    tokenMintA,
    tokenMintB,
    // tokenOracleA,
    // tokenOracleB,
    cladKey,
    initTickIndex,
    initPrice,
    initSqrtPrice,
  }
}

export async function getPostPoolInitParams() {
  const cParams = await getConstantParams()

  const globalpoolSeeds = [
    Buffer.from('globalpool'),
    cParams.tokenMintA.address.toBuffer(),
    cParams.tokenMintB.address.toBuffer(),
    new anchor.BN(cParams.feeRate).toArrayLike(Buffer, 'le', 2),
    new anchor.BN(cParams.tickSpacing).toArrayLike(Buffer, 'le', 2),
  ]

  const [globalpoolKey] = PublicKey.findProgramAddressSync(
    globalpoolSeeds,
    cParams.programId
  )

  return {
    ...cParams,
    globalpoolKey,
  }
}
