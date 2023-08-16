import * as anchor from '@coral-xyz/anchor'
import { web3 } from '@coral-xyz/anchor'
import { MathUtil, Percentage } from '@orca-so/common-sdk'
import * as assert from 'assert'
import { BN } from 'bn.js'
import Decimal from 'decimal.js'

import CladIx from '@/ix'
import { getTokenBalance, toTx } from '@/utils'
import { CladClient, CladContext } from '@/impl/clad'
import { defaultConfirmOptions, TickSpacing } from '@/utils/constants'
import { initTestPoolWithTokens } from '@/utils/init-utils'

import { swapQuoteByInputToken } from '../../src'
import {
  FundedPositionParams,
  fundPositions,
  initTickArrayRange,
} from '../utils/init-utils'

describe('swap', () => {
  const provider = anchor.AnchorProvider.local(
    'http://127.0.0.1:8899',
    defaultConfirmOptions
  )

  const program = anchor.workspace.Clad
  const ctx = CladContext.fromWorkspace(provider, program)
  const fetcher = ctx.fetcher
  const client = new CladClient(ctx)

  it('swaps across one tick array', async () => {
    const { poolInitInfo, whirlpoolPda, tokenAccountA, tokenAccountB } =
      await initTestPoolWithTokens(ctx, TickSpacing.Standard)
    const aToB = false
    await initTickArrayRange(
      ctx,
      whirlpoolPda.publicKey,
      22528, // to 33792
      3,
      TickSpacing.Standard,
      aToB
    )

    const fundParams: FundedPositionParams[] = [
      {
        liquidityAmount: new anchor.BN(10_000_000),
        tickLowerIndex: 29440,
        tickUpperIndex: 33536,
      },
    ]

    await fundPositions(
      ctx,
      poolInitInfo,
      tokenAccountA,
      tokenAccountB,
      fundParams
    )

    const tokenVaultABefore = new anchor.BN(
      await getTokenBalance(provider, poolInitInfo.tokenVaultAKeypair.publicKey)
    )
    const tokenVaultBBefore = new anchor.BN(
      await getTokenBalance(provider, poolInitInfo.tokenVaultBKeypair.publicKey)
    )

    const whirlpoolKey = poolInitInfo.whirlpoolPda.publicKey
    const whirlpool = await client.getPool(whirlpoolKey, IGNORE_CACHE)
    const whirlpoolData = whirlpool.getData()
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintB,
      new BN(100000),
      Percentage.fromFraction(1, 100),
      ctx.program.programId,
      fetcher,
      IGNORE_CACHE
    )

    await toTx(
      ctx,
      CladIx.swapIx(ctx.program, {
        ...quote,
        whirlpool: whirlpoolPda.publicKey,
        tokenAuthority: ctx.wallet.publicKey,
        tokenOwnerAccountA: tokenAccountA,
        tokenVaultA: poolInitInfo.tokenVaultAKeypair.publicKey,
        tokenOwnerAccountB: tokenAccountB,
        tokenVaultB: poolInitInfo.tokenVaultBKeypair.publicKey,
      })
    ).buildAndExecute()

    assert.equal(
      await getTokenBalance(
        provider,
        poolInitInfo.tokenVaultAKeypair.publicKey
      ),
      tokenVaultABefore.sub(quote.estimatedAmountOut).toString()
    )
    assert.equal(
      await getTokenBalance(
        provider,
        poolInitInfo.tokenVaultBKeypair.publicKey
      ),
      tokenVaultBBefore.add(quote.estimatedAmountIn).toString()
    )
  })
})
