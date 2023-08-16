import { Connection, clusterApiUrl } from '@solana/web3.js'
import { Client, UtlConfig } from '@solflare-wallet/utl-sdk'

const config = new UtlConfig({
  /**
   * 101 - mainnet, 102 - testnet, 103 - devnet
   */
  chainId: 101,
  /**
   * number of miliseconds to wait until falling back to CDN
   */
  timeout: 2000,
  /**
   * Solana web3 Connection
   */
  connection: new Connection(clusterApiUrl('devnet')),
  /**
   * Backend API url which is used to query tokens
   */
  apiUrl: 'https://token-list-api.solana.cloud',
  /**
   * CDN hosted static token list json which is used in case backend is down
   */
  cdnUrl: 'https://cdn.jsdelivr.net/gh/solflare-wallet/token-list/solana-tokenlist.json'
})

const tokenListUtl = new Client(config)

export default tokenListUtl

// usage:
// import type { Token } from '@solana/web3.js'
// import tokenListUtl from '@/lib/tokenList'
// const token: Token = await utl.fetchMint(new PublicKey("So11111111111111111111111111111111111111112"))
//
// const mints = [
//   new PublicKey("So11111111111111111111111111111111111111112"), // WSOL
//   new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
//   new PublicKey("FjWWxNDB2uVjeaKR7nVjFjxTau85wVfAzwbLbpmJot3v") // Fake USDC (fetched from Metaplex metadata)
// ]

// const utl = new Client()
// const tokens: Token[] = await utl.fetchMints(mints)