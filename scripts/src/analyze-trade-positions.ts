import { PriceMath } from '@orca-so/whirlpools-sdk'
import { getMint, Mint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
} from '@solana/web3.js'
import BN from 'bn.js'

import { getPostPoolInitParams } from './params'
import {
  consoleLogFull,
  getAccountData,
  getTokenBalance,
  truncatedAddress,
} from './utils'
import { ParsableGlobalpool, ParsableTradePosition } from './types/parsing'
import { GlobalpoolData, TradePositionData } from './types/accounts'
import { PositionStatus } from './utils/liquidity-position/types'
import { PositionUtil } from './utils/liquidity-position/utils'
import { getTokenAmountsFromLiquidity } from './utils/token-math'

type UserPosition = {
  key: PublicKey
  mint: PublicKey
  ata: PublicKey
  data: TradePositionData
}

function paddedConsoleLogBlock(str: string[]) {
  str.forEach((s) => console.log(' '.repeat(10), s))
  console.log()
}

async function getUserPositions(
  positionAuthority: PublicKey,
  connection: Connection,
  programId: PublicKey
): Promise<UserPosition[]> {
  // Get pubkey's all ATAs
  const positionTokenAccounts = await connection.getParsedProgramAccounts(
    TOKEN_PROGRAM_ID,
    {
      filters: [
        {
          dataSize: 165, // number of bytes
        },
        {
          memcmp: {
            offset: 32, // number of bytes
            bytes: positionAuthority.toBase58(), // base58 encoded string
          },
        },
      ],
    }
  )

  // Get Globalpool position pubkeys
  const fetchedPositionKeysAndData = await Promise.all(
    positionTokenAccounts.map(async (tokenAccount) => {
      try {
        const tokenAccountInfo = (
          tokenAccount.account as AccountInfo<ParsedAccountData>
        ).data.parsed.info

        // Filter associated token accounts only with 1 token owned
        if (tokenAccountInfo.tokenAmount.amount !== '1') return null

        // Derive Position PDA using TokenMint pubkey
        const tokenMint = new PublicKey(tokenAccountInfo.mint)
        const [positionKey] = PublicKey.findProgramAddressSync(
          [Buffer.from('trade_position'), tokenMint.toBuffer()],
          programId
        )
        if (!positionKey) return null

        // Get Position data
        const data = await getAccountData(
          positionKey,
          ParsableTradePosition,
          connection
        )
        if (!data) return null

        return {
          key: positionKey,
          mint: tokenMint,
          ata: tokenAccount.pubkey,
          data,
        }
      } catch (err) {
        console.log(err)
        return null
      }
    })
  )

  return fetchedPositionKeysAndData.filter((p) => !!p) as UserPosition[]
}

async function main() {
  const { provider, programId, connection } = await getPostPoolInitParams()

  const positionAuthority = provider.wallet.publicKey

  const positions = await getUserPositions(
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
      PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex),
      PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex),
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
      PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex),
      PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex),
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
      PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex),
      PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex),
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
      PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex),
      PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex),
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
