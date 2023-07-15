import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

import { consoleLogFull, getAccountData, getTokenBalance } from './utils'
import { ParsableGlobalpool } from './types/parsing'
import { getPostPoolInitParams } from './params'

async function main() {
  const {
    provider,
    connection,
    cladKey,
    globalpoolKey,
  } = await getPostPoolInitParams()

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
  
  consoleLogFull(globalpoolInfo)

  const tokenVaultABefore = new anchor.BN(
    await getTokenBalance(provider, globalpoolInfo.tokenVaultA)
  )
  const tokenVaultBBefore = new anchor.BN(
    await getTokenBalance(provider, globalpoolInfo.tokenVaultB)
  )

  console.log('token Vault A before: ', tokenVaultABefore.div(new anchor.BN(10 ** 6)).toString())
  console.log('token Vault B before: ', tokenVaultBBefore.div(new anchor.BN(10 ** 6)).toString())
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
