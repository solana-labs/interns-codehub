import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
} from '@solana/web3.js'

import { getAccountData } from '../utils'
import { ParsableTradePosition } from '../types/parsing'
import { TradePositionData } from '../types/accounts'

export type UserTradePosition = {
  key: PublicKey
  mint: PublicKey
  ata: PublicKey
  data: TradePositionData
}

export async function getUserTradePositions(
  positionAuthority: PublicKey,
  connection: Connection,
  programId: PublicKey
): Promise<UserTradePosition[]> {
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

  return fetchedPositionKeysAndData.filter((p) => !!p) as UserTradePosition[]
}
