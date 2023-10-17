import { PriceMath } from '@orca-so/whirlpools-sdk'
import { getMint, Mint } from '@solana/spl-token'
import BN from 'bn.js'

import { getPostPoolInitParams } from '../params'
import {
  getAccountData,
  truncatedAddress,
} from '../utils'
import { ParsableGlobalpool } from '../types/parsing'
import { GlobalpoolData } from '../types/accounts'
import { PositionStatus } from '../utils/liquidity-position/types'
import { PositionUtil } from '../utils/liquidity-position/utils'
import { getUserTradePositions } from '../utils/position'
import { getTokenAmountsFromLiquidity } from '../utils/token-math'

function paddedConsoleLogBlock(str: string[]) {
  str.forEach((s) => console.log(' '.repeat(10), s))
  console.log()
}

async function main() {
  const { provider, programId, connection } = await getPostPoolInitParams()

  const positionAuthority = provider.wallet.publicKey

  const positions = await getUserTradePositions(
    positionAuthority,
    connection,
    programId
  )

  const cachedGlobalpoolData: Map<string, GlobalpoolData> = new Map()
  const cachedTokenMints: Map<string, Mint> = new Map()

  for (const position of positions) {
    const { globalpool: globalpoolKey, positionMint } = position.data

    // use cache or fetch
    if (!cachedGlobalpoolData.has(globalpoolKey.toBase58())) {
      cachedGlobalpoolData.set(
        globalpoolKey.toBase58(),
        (await getAccountData(
          position.data.globalpool,
          ParsableGlobalpool,
          connection
        )) as GlobalpoolData
      )
    }

    const {
      tokenMintA: mintAKey,
      tokenMintB: mintBKey,
      tickCurrentIndex,
      sqrtPrice: currentSqrtPrice,
      tickSpacing: poolTickSpacing,
    } = cachedGlobalpoolData.get(globalpoolKey.toBase58()) as GlobalpoolData

    if (!cachedTokenMints.has(mintAKey.toBase58())) {
      cachedTokenMints.set(
        mintAKey.toBase58(),
        (await getMint(connection, mintAKey)) as Mint
      )
    }

    if (!cachedTokenMints.has(mintBKey.toBase58())) {
      cachedTokenMints.set(
        mintBKey.toBase58(),
        (await getMint(connection, mintBKey)) as Mint
      )
    }

    const mintA = cachedTokenMints.get(mintAKey.toBase58()) as Mint
    const mintB = cachedTokenMints.get(mintBKey.toBase58()) as Mint
    const { tickLowerIndex, tickUpperIndex } = position.data
    const baseDecimals = mintB.decimals - 4 // x B per 1 A

    const [startPrice, endPrice] = [tickLowerIndex, tickUpperIndex].map(
      (tickIndex) =>
        PriceMath.tickIndexToPrice(tickIndex, mintA.decimals, mintB.decimals)
    )

    const priceRange = [
      // display price range
      startPrice.toFixed(baseDecimals),
      endPrice.toFixed(baseDecimals),
    ]

    const posRanged = PositionUtil.getPositionStatus(
      tickCurrentIndex,
      tickLowerIndex,
      tickUpperIndex
    )

    // console.log(
    //   new BN(currentSqrtPrice.toString()).toString(),
    //   PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex).toString(),
    //   PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex).toString(),
    // )

    const tokenAmountsToRepayCurrent = getTokenAmountsFromLiquidity(
      position.data.liquidityBorrowed,
      new BN(currentSqrtPrice.toString()),
      tickLowerIndex,
      tickUpperIndex,
      true
    )

    const mockInterval = 22 * poolTickSpacing

    const mockTick1 = tickUpperIndex + mockInterval
    const mockPrice1 = PriceMath.tickIndexToPrice(
      mockTick1,
      mintA.decimals,
      mintB.decimals
    ).toFixed(mintB.decimals)
    const tokenAmountsToRepayMock1 = getTokenAmountsFromLiquidity(
      position.data.liquidityBorrowed,
      PriceMath.tickIndexToSqrtPriceX64(mockTick1),
      tickLowerIndex,
      tickUpperIndex,
      true
    )

    const mockTick2 = tickLowerIndex - mockInterval
    const mockPrice2 = PriceMath.tickIndexToPrice(
      mockTick2,
      mintA.decimals,
      mintB.decimals
    ).toFixed(mintB.decimals)
    const tokenAmountsToRepayMock2 = getTokenAmountsFromLiquidity(
      position.data.liquidityBorrowed,
      PriceMath.tickIndexToSqrtPriceX64(mockTick2),
      tickLowerIndex,
      tickUpperIndex,
      true
    )

    const mockTick3 = (tickUpperIndex + tickLowerIndex) / 2 // mid-point of the position range
    const mockPrice3 = PriceMath.tickIndexToPrice(
      mockTick3,
      mintA.decimals,
      mintB.decimals
    ).toFixed(mintB.decimals)
    const tokenAmountsToRepayMock3 = getTokenAmountsFromLiquidity(
      position.data.liquidityBorrowed,
      PriceMath.tickIndexToSqrtPriceX64(mockTick3),
      tickLowerIndex,
      tickUpperIndex,
      true
    )

    console.log(`  position pubkey: ${position.key.toBase58().padEnd(44, ' ')}`)
    console.log(`  position mint:   ${positionMint.toBase58().padEnd(44, ' ')}`)
    console.log(
      `  [pool: ${truncatedAddress(globalpoolKey.toBase58())}]  `,
      `  ctick: ${tickCurrentIndex}`
    )
    console.log(
      ' '.repeat(10),
      'status:   ',
      posRanged === PositionStatus.InRange
        ? 'in-range'
        : posRanged === PositionStatus.AboveRange
        ? 'above-range'
        : 'below-range'
    )

    paddedConsoleLogBlock([
      `tick:      [${tickLowerIndex}, ${tickUpperIndex})`.padEnd(26, ' '),
      `range:     [${priceRange[0]}, ${priceRange[1]})`.padEnd(32, ' '),
      `is trade open: ${
        position.data.loanTokenSwapped.eq(new BN(0)) ? 'no' : 'yes'
      }`,
    ])

    paddedConsoleLogBlock([
      `loan token mint:        ${position.data.tokenMintLoan.toBase58()}`,
      `loan token available:   ${position.data.loanTokenAvailable}`,
      `loan token swapped:     ${position.data.loanTokenSwapped}`,
    ])

    paddedConsoleLogBlock([
      `collateral mint:        ${position.data.tokenMintCollateral.toBase58()}`,
      `collateral available:   ${position.data.collateralAmount}`,
    ])

    paddedConsoleLogBlock([
      'Current repayment on closing position',
      `Token A:   ${tokenAmountsToRepayCurrent.tokenA.toString()}`,
      `Token B:   ${tokenAmountsToRepayCurrent.tokenB.toString()}`,
    ])

    paddedConsoleLogBlock([
      `Mock 1, Price = ${mockPrice1}`,
      `Token A:   ${tokenAmountsToRepayMock1.tokenA.toString()}`,
      `Token B:   ${tokenAmountsToRepayMock1.tokenB.toString()}`,
    ])

    paddedConsoleLogBlock([
      `Mock 2, Price = ${mockPrice2}`,
      `Token A:   ${tokenAmountsToRepayMock2.tokenA.toString()}`,
      `Token B:   ${tokenAmountsToRepayMock2.tokenB.toString()}`,
    ])

    paddedConsoleLogBlock([
      `Mock 3, Price = ${mockPrice3}`,
      `Token A:   ${tokenAmountsToRepayMock3.tokenA.toString()}`,
      `Token B:   ${tokenAmountsToRepayMock3.tokenB.toString()}`,
    ])
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
