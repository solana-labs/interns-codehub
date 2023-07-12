import * as anchor from '@coral-xyz/anchor'
import { MathUtil } from '@orca-so/common-sdk'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import Decimal from 'decimal.js'

import { Clad } from '@/target/types/clad'
import { CladContext } from '../impl/clad'
import { DEFAULT_SQRT_PRICE, TickSpacing } from './constants'
import { CladIx } from '@/ix'

const { Program } = anchor

export type InitConfigParams = {
  whirlpoolsConfigKeypair: Keypair
  feeAuthority: PublicKey
  collectProtocolFeesAuthority: PublicKey
  defaultProtocolFeeRate: number
  funder: PublicKey
}

export type InitPoolParams = {
  initSqrtPrice: anchor.BN
  whirlpoolsConfig: PublicKey
  whirlpoolPda: PublicKey
  tokenMintA: PublicKey
  tokenMintB: PublicKey
  tokenVaultAKeypair: Keypair
  tokenVaultBKeypair: Keypair
  feeTierKey: PublicKey
  tickSpacing: number
  funder: PublicKey
}

interface TestPoolParams {
  configInitInfo: InitConfigParams
  poolInitInfo: InitPoolParams
  feeTierParams: any
}

export type FundedPositionParams = {
  tickLowerIndex: number
  tickUpperIndex: number
  liquidityAmount: anchor.BN
}

interface InitTestFeeTierParams {
  tickSpacing: number
  feeRate?: number
}

interface InitTestPoolParams {
  mintIndices: [number, number]
  tickSpacing: number
  feeTierIndex?: number
  initSqrtPrice?: anchor.BN
}

interface InitTestMintParams {
  // Default false
  isNative?: boolean
}

interface InitTestTokenAccParams {
  mintIndex: number
  mintAmount?: anchor.BN
}

interface InitTestTickArrayRangeParams {
  poolIndex: number
  startTickIndex: number
  arrayCount: number
  aToB: boolean
}

interface InitTestPositionParams {
  poolIndex: number
  fundParams: FundedPositionParams[]
}

export const DEFAULT_INIT_POOL: InitTestPoolParams[] = [
  { mintIndices: [0, 1], tickSpacing: TickSpacing.Standard },
]
export const DEFAULT_INIT_TICK_ARR: InitTestTickArrayRangeParams[] = []
export const DEFAULT_INIT_POSITION: InitTestPositionParams[] = []


export async function buildTestPoolParams(
  ctx: CladContext,
  tickSpacing: number,
  defaultFeeRate = 3000,
  initSqrtPrice = DEFAULT_SQRT_PRICE,
  funder?: PublicKey,
  reuseTokenA?: PublicKey
) {
	const configKeypairs = {
		feeAuthorityKeypair: Keypair.generate(),
	}
	const configInitInfo = {
    whirlpoolsConfigKeypair: Keypair.generate(),
    feeAuthority: configKeypairs.feeAuthorityKeypair.publicKey,
    defaultProtocolFeeRate: 300,
    funder: funder || ctx.wallet.publicKey,
  };

  await toTx(ctx, CladIx.initializeConfigIx(ctx.program, configInitInfo)).buildAndExecute();

  const poolInitInfo = await generateDefaultInitPoolParams(
    ctx,
    configInitInfo.whirlpoolsConfigKeypair.publicKey,
    feeTierParams.feeTierPda.publicKey,
    tickSpacing,
    initSqrtPrice,
    funder,
    reuseTokenA
  );
  return {
    configInitInfo,
    configKeypairs,
    poolInitInfo,
    feeTierParams,
  };
}

export async function initTestPool(
  ctx: CladContext,
  tickSpacing: number,
  initSqrtPrice = DEFAULT_SQRT_PRICE,
  funder?: Keypair,
  reuseTokenA?: PublicKey
) {
  const { configInitInfo, poolInitInfo, configKeypairs, feeTierParams } = await buildTestPoolParams(
    ctx,
    tickSpacing,
    3000,
    initSqrtPrice,
    funder?.publicKey,
    reuseTokenA
  );

  const tx = toTx(ctx, WhirlpoolIx.initializePoolIx(ctx.program, poolInitInfo));
  if (funder) tx.addSigner(funder);

  return {
    txId: await tx.buildAndExecute(),
    configInitInfo,
    configKeypairs,
    poolInitInfo,
    feeTierParams,
  };
}

export async function initTestPoolWithTokens(
  ctx: CladContext,
  tickSpacing: number,
  initSqrtPrice = DEFAULT_SQRT_PRICE,
  mintAmount = new anchor.BN('15000000000'),
  reuseTokenA?: PublicKey
) {
  const provider = ctx.provider

  const { poolInitInfo, configInitInfo, configKeypairs, feeTierParams } =
    await initTestPool(ctx, tickSpacing, initSqrtPrice, undefined, reuseTokenA)

  const { tokenMintA, tokenMintB, whirlpoolPda } = poolInitInfo

  // Airdrop SOL into provider's wallet for SOL native token testing.
  const connection = ctx.provider.connection
  const airdropTx = await connection.requestAirdrop(
    ctx.provider.wallet.publicKey,
    100_000_000_000_000
  )
  await ctx.connection.confirmTransaction(
    {
      signature: airdropTx,
      ...(await ctx.connection.getLatestBlockhash('confirmed')),
    },
    'confirmed'
  )

  const tokenAccountA = await createAndMintToAssociatedTokenAccount(
    provider,
    tokenMintA,
    mintAmount
  )

  const tokenAccountB = await createAndMintToAssociatedTokenAccount(
    provider,
    tokenMintB,
    mintAmount
  )

  return {
    poolInitInfo,
    configInitInfo,
    configKeypairs,
    feeTierParams,
    whirlpoolPda,
    tokenAccountA,
    tokenAccountB,
  }
}
