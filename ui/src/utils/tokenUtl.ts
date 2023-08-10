import { Cluster, Connection, clusterApiUrl } from '@solana/web3.js'
import { Client as UtlClient, UtlConfig } from '@solflare-wallet/utl-sdk'

let target = process.env.NEXT_PUBLIC_SOLANA_TARGET as 'mainnet-beta' | 'devnet' | 'localnet'
if (target === 'localnet') target = 'mainnet-beta'
const connection = new Connection(clusterApiUrl(target as Cluster))

const utlConfig = new UtlConfig({
  // 101 - mainnet, 102 - testnet, 103 - devnet (localnet uses mainnet tokenlist)
  chainId: process.env.NEXT_PUBLIC_SOLANA_TARGET === 'devnet' ? 102 : 101,
  timeout: 2000,
  connection,
  apiUrl: 'https://token-list-api.solana.cloud',
  cdnUrl: 'https://cdn.jsdelivr.net/gh/solflare-wallet/token-list/solana-tokenlist.json',
})

export const tokenUtl = new UtlClient(utlConfig)
