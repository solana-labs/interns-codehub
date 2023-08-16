import * as anchor from '@coral-xyz/anchor'
import { getMint } from '@solana/spl-token'
import { Keypair, PublicKey } from '@solana/web3.js'

import poolConfigs from './pool-config.json'
import { Clad } from './target/types/clad'
import { requestAirdrop } from './utils/token'

export function getPDA(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, programId)[0]
}

export async function getConstantParams() {
  const provider = anchor.AnchorProvider.local('http://127.0.0.1:8899', {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  const { connection } = provider

  const program = anchor.workspace.Clad as anchor.Program<Clad>

  const fundedSigner = Keypair.generate()

  // airdrop SOL
  if ((await connection.getBalance(fundedSigner.publicKey)) === 0) {
    await requestAirdrop(provider, { receiver: fundedSigner.publicKey })
  }

  const [cladKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('clad')],
    program.programId
  )

  return {
    provider,
    fundedSigner,
    program,
    programId: program.programId,
    connection,
    wallet: provider.wallet,
    cladKey,
  }
}

export async function getPostPoolInitParams() {
  const cParams = await getConstantParams()

  // Tests
  const poolConfig = poolConfigs['HNT/USDC']
  const tokenMintAKey = new PublicKey(poolConfig.baseToken.address)
  const tokenMintBKey = new PublicKey(poolConfig.quoteToken.address)
  const feeRate = poolConfig.feeRate
  const tickSpacing = poolConfig.tickSpacing

  const globalpoolSeeds = [
    Buffer.from('globalpool'),
    tokenMintAKey.toBuffer(),
    tokenMintBKey.toBuffer(),
    new anchor.BN(feeRate).toArrayLike(Buffer, 'le', 2),
    new anchor.BN(tickSpacing).toArrayLike(Buffer, 'le', 2),
  ]

  const [globalpoolKey] = PublicKey.findProgramAddressSync(
    globalpoolSeeds,
    cParams.programId
  )

  const tokenMintA = await getMint(cParams.provider.connection, tokenMintAKey)
  const tokenMintB = await getMint(cParams.provider.connection, tokenMintBKey)

  return {
    ...cParams,
    tokenMintA,
    tokenMintB,
    feeRate,
    tickSpacing,
    globalpoolKey,
  }
}
