import { AccountLayout } from '@solana/spl-token'
import { AnchorWallet } from '@solana/wallet-adapter-react'
import { Connection, Transaction } from '@solana/web3.js'
import { resolveOrCreateATAs } from '@orca-so/common-sdk'
import axios from 'axios'

import testTokens from '@/data/testTokens'

export async function airdropTestTokens(
	connection: Connection,
	wallet: AnchorWallet,
) {
	console.log('DEBUG(airdrop): Airdropping test tokens')
	const tokenMints = Object.values(testTokens).map((token) => ({ tokenMint: token.mint }))

	const resolveAtaIxs = await resolveOrCreateATAs(
		connection,
		wallet.publicKey,
		tokenMints,
		() => connection.getMinimumBalanceForRentExemption(AccountLayout.span),
	)
	console.log(resolveAtaIxs)

	if (resolveAtaIxs && resolveAtaIxs.length > 0) {
		const resolveAtaPreIxs = resolveAtaIxs.map((ix) => ix.instructions).flat()
		const resolveAtaPostIxs = resolveAtaIxs.map((ix) => ix.cleanupInstructions).flat()
		const resolveAtaSigners = resolveAtaIxs.map((ix) => ix.signers).flat()

		const transaction = new Transaction()
		transaction.feePayer = wallet.publicKey
		transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

		if (resolveAtaPreIxs.length) transaction.add(...resolveAtaPreIxs)
		if (resolveAtaPostIxs.length) transaction.add(...resolveAtaPostIxs)
		if (resolveAtaSigners.length) transaction.sign(...resolveAtaSigners)

		const signedTx = await wallet.signTransaction(transaction)

		const txid = await connection.sendRawTransaction(signedTx.serialize())
		console.log('airdrop txid', txid)
	}

	const res = await axios.get(`/api/airdrop?receiver=${wallet.publicKey.toBase58()}`)
	console.log(res.status, res.data)
}