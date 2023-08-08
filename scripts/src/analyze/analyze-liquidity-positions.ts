import { PriceMath } from '@orca-so/whirlpools-sdk'
import { getMint, Mint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
} from '@solana/web3.js'

import { getPostPoolInitParams } from '../params'
import {
  consoleLogFull,
  getAccountData,
  getTokenBalance,
  truncatedAddress,
} from '../utils'
import { ParsableGlobalpool, ParsableLiquidityPosition } from '../types/parsing'
import { GlobalpoolData, LiquidityPositionData } from '../types/accounts'
import { PositionStatus } from '../utils/liquidity-position/types'
import { PositionUtil } from '../utils/liquidity-position/utils'

type UserPosition = {
  key: PublicKey
  mint: PublicKey
  ata: PublicKey
  data: LiquidityPositionData
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
          [Buffer.from('liquidity_position'), tokenMint.toBuffer()],
          programId
        )
        if (!positionKey) return null

        // Get Position data
        const data = await getAccountData(
          positionKey,
          ParsableLiquidityPosition,
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
    const globalpoolKey = position.data.globalpool

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

    console.log(
      ' '.repeat(2),
      position.key.toBase58().padEnd(44, ' '),
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
    console.log(
      ' '.repeat(10),
      `tick:      [${tickLowerIndex}, ${tickUpperIndex})`.padEnd(26, ' ')
    )
    console.log(
      ' '.repeat(10),
      `range:     [${priceRange[0]}, ${priceRange[1]})`.padEnd(32, ' ')
    )
    console.log(' '.repeat(10), `liquidity: ${position.data.liquidity}`)
    console.log()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
