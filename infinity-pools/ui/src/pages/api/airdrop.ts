import { getAccount, getAssociatedTokenAddressSync, mintTo } from '@solana/spl-token'
import { clusterApiUrl, Connection, Keypair, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import testTokens from '@/data/testTokens'
import { isBase58 } from '@/utils'

const MAX_AIRDROP_HOLD_AMOUNT = new BN(100_000_000) // not scaled to decimals
const MINT_AMOUNT = new BN(10_000_000) // not scaled to decimals

const secretKey = (process.env.AIRDROP_SECRET_KEY as string).split(',').map(Number)
const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(secretKey))

export default async function handler(req: any, res: any) {
	const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

	const receiver = req.query?.receiver as string
	if (!receiver || !isBase58(receiver)) {
		res.status(400).json({ error: 'Invalid receiver' })
		return
	}
	const receiverPubkey = new PublicKey(receiver)

	const mintToProms = []

	for (const testToken of Object.values(testTokens)) {
		const receiverATA = getAssociatedTokenAddressSync(
			testToken.mint,
			receiverPubkey,
		)

		let tokenAccountInfo
		try {
			tokenAccountInfo = await getAccount(
				connection,
				receiverATA
			)
		} catch (err) {
			console.error(err)
			res.status(500).json({ success: false, error: 'Failed to get token account' })
			return
		}

		const expo = new BN(Math.pow(10, testToken.decimals))
		const maxAmount = MAX_AIRDROP_HOLD_AMOUNT.mul(expo)
		const mintAmount = MINT_AMOUNT.mul(expo)
		const balance = new BN(tokenAccountInfo.amount.toString())

		if (balance.add(mintAmount).gte(maxAmount)) continue

		const mintToProm = mintTo(
			connection,
			mintAuthority,
			testToken.mint,
			receiverATA,
			mintAuthority,
			BigInt(mintAmount.toString())
		)
		mintToProms.push(mintToProm)
	}

	await Promise.all(mintToProms)
		.catch((err) => {
			console.error(err)
			res.status(500).json({ success: false, error: 'Failed to mint tokens' })
		})

	res.status(200).json({ success: true, error: '' })
}