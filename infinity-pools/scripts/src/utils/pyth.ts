import { Connection } from '@solana/web3.js'
import { PythHttpClient, getPythClusterApiUrl, getPythProgramKeyForCluster, PythCluster } from '@pythnetwork/client'

const PYTHNET_CLUSTER_NAME: PythCluster = 'pythnet'
const connection = new Connection(getPythClusterApiUrl(PYTHNET_CLUSTER_NAME))
const pythPublicKey = getPythProgramKeyForCluster(PYTHNET_CLUSTER_NAME)

export async function getPythPrices(symbols: string[]) {
	const pythClient = new PythHttpClient(connection, pythPublicKey)
	const data = await pythClient.getData()

	const prices: Record<string, number> = {}

	for (const symbol of data.symbols) {
		const productFromSymbol = data.productFromSymbol.get(symbol)!
		const { base: baseSymbol } = productFromSymbol
		
		if (!symbols.includes(baseSymbol)) continue
		
		const price = data.productPrice.get(symbol)!

		if (price.price && price.confidence) {
			prices[baseSymbol] = price.price
		}
	}
	
	return prices
}

getPythPrices(['HNT', 'ORCA', 'MNGO', 'RAY', 'FIDA', 'BONK', 'USDC'])