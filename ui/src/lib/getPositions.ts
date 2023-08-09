// Both trade & liquidity positions

import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { AccountInfo, Connection, ParsedAccountData, PublicKey } from "@solana/web3.js"

import { getAccountData } from "@/lib"
import { UserLiquidityPosition, UserTradePosition } from "@/types/user"
import { ParsableLiquidityPosition, ParsableTradePosition } from "@/types/parsing"

enum PositionType {
  TRADE,
  LIQUIDITY,
}

export async function getUserTradePositions(
  user: PublicKey,
  connection: Connection,
  programId: PublicKey,
) {
  return getUserPositions<UserTradePosition>(user, PositionType.TRADE, connection, programId)
}

export async function getUserLiquidityPositions(
  user: PublicKey,
  connection: Connection,
  programId: PublicKey,
) {
  return getUserPositions<UserLiquidityPosition>(user, PositionType.LIQUIDITY, connection, programId)
}

async function getUserPositions<T>(
  user: PublicKey,
  positionType: PositionType,
  connection: Connection,
  programId: PublicKey
): Promise<T[]> {
  const seed = positionType === PositionType.TRADE ? 'trade_position' : 'liquidity_position'

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
            bytes: user.toBase58(), // base58 encoded string
          },
        },
      ],
    }
  )
  console.log(positionTokenAccounts)

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
          [Buffer.from(seed), tokenMint.toBuffer()],
          programId
        )
        if (!positionKey) return null

        // Get Position data
        let data = undefined
        if (positionType === PositionType.TRADE) {
          data = await getAccountData(
            positionKey,
            ParsableTradePosition,
            connection
          )
        } else if (positionType === PositionType.LIQUIDITY) {
          data = await getAccountData(
            positionKey,
            ParsableLiquidityPosition,
            connection
          )
        }

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

  return fetchedPositionKeysAndData.filter((p) => !!p) as T[]
}