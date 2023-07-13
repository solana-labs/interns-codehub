import { AnchorProvider } from '@coral-xyz/anchor'
import { ParsableEntity } from '@orca-so/common-sdk'
import { Connection, PublicKey } from '@solana/web3.js'
import * as util from 'util'

export async function getAccountData<T>(
  publicKey: PublicKey,
  parser: ParsableEntity<T>,
  connection: Connection
): Promise<T> {
  const accountInfo = await connection.getAccountInfo(publicKey)
  if (accountInfo === null) {
    throw new Error(`Account does not exist ${publicKey.toBase58()}`)
  }
	const parsed = parser.parse(publicKey, accountInfo)
	if (parsed === null) {
		throw new Error(`Could not parse account data ${publicKey.toBase58()}`)
	}
  return parsed
}

export async function getTokenBalance(provider: AnchorProvider, vault: PublicKey) {
  return (await provider.connection.getTokenAccountBalance(vault, "confirmed")).value.amount;
}

export function consoleLogFull(obj: any) {
  console.log(util.inspect(obj, {showHidden: false, depth: null, colors: true}))
}