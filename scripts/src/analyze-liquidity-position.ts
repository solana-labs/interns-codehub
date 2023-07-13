import * as anchor from '@coral-xyz/anchor'
import { getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
} from '@solana/web3.js'
import BN from 'bn.js'

import { consoleLogFull, getAccountData, getTokenBalance } from './utils'
import { ParsableGlobalpool } from './types/parsing'
import { getPostPoolInitParams } from './params'

async function getPositionPubkeys(
  positionAuthority: PublicKey,
  connection: Connection,
  programId: PublicKey
): Promise<PublicKey[]> {
  // Get pubkey's all ATAs
  const tokenAccounts = await connection.getParsedProgramAccounts(
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

  // Get ATAs with 1 token
  const positionKeys = tokenAccounts
    .filter((tokenAccount) => {
      try {
        return (
          (tokenAccount.account as AccountInfo<ParsedAccountData>).data.parsed
            .info.tokenAmount.amount === '1'
        )
      } catch (err) {
        return false
      }
    })
    .map((tokenAccount) => tokenAccount.pubkey)

  return positionKeys
}

async function main() {
  const {
    provider,
    programId,
    connection,
    feeRate,
    tickSpacing,
    tokenMintAKey,
    tokenMintBKey,
    cladKey,
    globalpoolKey,
  } = await getPostPoolInitParams()

  const positionAuthority = provider.wallet.publicKey

  console.log(`Clad: ${cladKey.toBase58()}`)
  console.log(`Globalpool: ${globalpoolKey.toBase58()}`)

  const globalpoolInfo = await getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )
  if (!globalpoolInfo) {
    throw new Error('Globalpool not found')
  }

  const positionKeys = await getPositionPubkeys(
    positionAuthority,
    connection,
    programId
  )
  console.log(positionKeys)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
