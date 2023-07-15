import { AnchorProvider } from '@coral-xyz/anchor'
import { ParsableEntity } from '@orca-so/common-sdk'
import { Connection, PublicKey } from '@solana/web3.js'
import * as util from 'util'

export async function getAccountData<T>(
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

export async function getTokenBalance(provider: AnchorProvider, vault: PublicKey) {
  return (await provider.connection.getTokenAccountBalance(vault, "confirmed")).value.amount;
}

export function consoleLogFull(obj: any) {
  console.log(util.inspect(obj, {showHidden: false, depth: null, colors: true}))
}

export function truncatedAddress(str: string) {
  // Truncate middle
  return str.substring(0, 6) + '...' + str.substring(str.length-6, str.length);
}