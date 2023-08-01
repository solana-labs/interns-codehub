import { ParsableEntity } from '@orca-so/common-sdk'
import { Connection, PublicKey } from '@solana/web3.js'

export default async function getAccountData<T>(
  publicKey: PublicKey,
  parser: ParsableEntity<T>,
  connection: Connection
): Promise<T | null> {
  const accountInfo = await connection.getAccountInfo(publicKey)
  if (accountInfo === null) {
    // console.error(`Account does not exist ${publicKey.toBase58()}`)
    return null
  }
	const parsed = parser.parse(publicKey, accountInfo)
	if (parsed === null) {
		console.error(`Could not parse account data ${publicKey.toBase58()}`)
    return null
	}
  return parsed
}
