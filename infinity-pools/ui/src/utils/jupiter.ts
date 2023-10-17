import { AnchorProvider } from '@coral-xyz/anchor'
import { Jupiter, SwapMode, RouteInfo } from '@jup-ag/core'
import {
  AccountMeta,
  PublicKey,
  Transaction,
} from '@solana/web3.js'
import JSBI from 'jsbi'

import { JUPITER_PROGRAM_ID } from '@/constants'
import { SwapRouteParams } from '@/types/jupiter'

async function getRecentBlockhash(
  provider: AnchorProvider
): Promise<string | null> {
  return provider.connection
    .getLatestBlockhash()
    .then((blockhashConfig) => blockhashConfig.blockhash)
    .catch((err) => {
      console.error(err)
      return null
    })
}

function isSlippageExceeding(
  cmpAmt: number,
  targetAmt: number,
  maxSlippage: number
) {
  return (targetAmt - cmpAmt) / targetAmt > maxSlippage
}

export async function getRoutesFromJupiter(
  params: SwapRouteParams,
  jupiter: Jupiter
) {
  const { a2b, tokenA, tokenB, amount, slippageBps, swapMode } = params

  const inputMint = a2b ? tokenA : tokenB
  const outputMint = a2b ? tokenB : tokenA
  console.log(`DEBUG(Jupiter): Input mint: ${inputMint.toBase58()}`)
  console.log(`DEBUG(Jupiter): Output mint: ${outputMint.toBase58()}`)
  console.log(`DEBUG(Jupiter): Amount: ${amount}`)

  return jupiter
    .computeRoutes({
      inputMint: a2b ? tokenA : tokenB,
      outputMint: a2b ? tokenB : tokenA,
      amount: JSBI.BigInt(amount.toString()),
      slippageBps,
      feeBps: 0, // no fee charged by our program
      forceFetch: true,
      // TODO: For shit coins, it's probably better to swap hops,
      //       which requires creating ATA for the program for each hopped token.
      //       So just do direct routes for now.
      onlyDirectRoutes: true,
      swapMode: swapMode || SwapMode.ExactIn,
      filterTopNResult: 2,
    })
    .then((res) => res.routesInfos)
    .catch((error) => {
      console.log('DEBUG(Jupiter): Failed to compute routes')
      console.error(error)
      return null
    })
}

export async function getRouteDataFromJupiterRoutes(
  routes: RouteInfo[],
  jupiter: Jupiter,
  provider: AnchorProvider,
  user: PublicKey, // globalpool pid
  maxSlippageFromBest = 0.05
) {
  if (!routes || !routes.length || !routes[0]) return null

  const recentBlockhash = await getRecentBlockhash(provider)
  if (!recentBlockhash) return null

  const bestRouteAmt = JSBI.toNumber(routes[0].otherAmountThreshold)

  for (const route of routes) {
    const thisRouteAmt = route.otherAmountThreshold
    if (
      isSlippageExceeding(
        JSBI.toNumber(thisRouteAmt),
        bestRouteAmt,
        maxSlippageFromBest
      )
    )
      return null

    const res = await jupiter
      .exchange({ routeInfo: route, userPublicKey: user })
      .catch((err) => {
        console.log('DEBUG(Jupiter): Failed to set exchange')
        console.error(err)
        return null
      })
    if (!res) {
      console.log('DEBUG(Jupiter): Skip route with no exchange info')
      continue
    }

    // console.log(res.transactions.swapTransaction)
    const swapTransaction = res.swapTransaction as Transaction
    if (!swapTransaction.instructions) {
      console.log('DEBUG(Jupiter): Skipped route with no instructions')
      continue // skip VersionedTransaction
    }

    let swapInstruction = swapTransaction.instructions.at(-1)
    if (!swapInstruction) {
      console.log('DEBUG(Jupiter): Skipped route with no swap instruction')
      continue
    }

    for (const key of swapInstruction.keys) {
      if (key.isSigner) {
        if (!key.pubkey.equals(user)) {
          console.log(key.pubkey)
          console.log('DEBUG(Jupiter): Skipped route with unexpected signer')
          continue
        }
        key.isSigner = false
      }
    }

    if (swapInstruction.programId.toString() !== JUPITER_PROGRAM_ID) {
      console.log(
        `DEBUG(Jupiter): Skipped route with unexpected router ID: ${swapInstruction.programId.toString()}`
      )
      continue
    }

    if (swapInstruction.programId.toString() !== JUPITER_PROGRAM_ID) {
      console.log('DEBUG(Jupiter): Skipped route with unexpected router ID')
      continue
    }

    const accounts: AccountMeta[] = []

    if (swapInstruction) {
      // router
      accounts.push({
        isSigner: false,
        isWritable: false,
        pubkey: swapInstruction.programId,
      })

      // jupiter accounts
      accounts.push(...swapInstruction.keys)
    }

    return { accounts, swapInstruction }
  }

  return null
}
