import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

import { getConstantParams } from '../params'
import poolConfigs from '../pool-config.json'
import { createAndMintToManyATAs } from '../utils/token'
import { getMint } from '@solana/spl-token'

async function main() {
  const {
    provider,
    wallet,
  } = await getConstantParams()

  const mintAmount = new anchor.BN(10_000_000) // 100k of each tokens
  const positionAuthority = wallet.publicKey

  const symbolSets = new Set<string>()

  Object.values(poolConfigs).map((poolConfig) => {
    symbolSets.add(poolConfig.baseToken.symbol)
    symbolSets.add(poolConfig.quoteToken.symbol)
  })

  Object.values(poolConfigs).map(async (poolConfig) => {
    const tokenMintAKey = new PublicKey(poolConfig.baseToken.address)
    const tokenMintBKey = new PublicKey(poolConfig.quoteToken.address)
    const tokenMintA = await getMint(provider.connection, tokenMintAKey)
    const tokenMintB = await getMint(provider.connection, tokenMintBKey)

    console.log()
    console.log(`Token A ${poolConfig.baseToken.symbol}:  ${tokenMintAKey.toBase58()}`)
    console.log(`Token B ${poolConfig.quoteToken.symbol}: ${tokenMintBKey.toBase58()}`)

    try {
      const [authorityTokenAccountA, authorityTokenAccountB] =
        await createAndMintToManyATAs(
          provider,
          [tokenMintA, tokenMintB],
          mintAmount,
          positionAuthority
        )
      console.log('ATA A: ', authorityTokenAccountA.toBase58())
      console.log('ATA B: ', authorityTokenAccountB.toBase58())
    } catch (err) {
      console.error(err)
      return
    }
  })
}

main()
  .then(() => console.log('Successfully airdropped tokens'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })