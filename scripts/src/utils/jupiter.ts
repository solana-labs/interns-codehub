import { AnchorProvider } from '@coral-xyz/anchor'
import { Jupiter, SwapMode, RouteInfo } from '@jup-ag/core'
import { AccountMeta, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import JSBI from 'jsbi'

import { JUPITER_PROGRAM_ID } from '../constants'
import { SwapRouteParams } from '../types/jupiter'

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
  const { a2b, tokenA, tokenB, amount, slippageBps, feeBps } = params

  const inputMint = a2b ? tokenA : tokenB
  const outputMint = a2b ? tokenB : tokenA
  console.log(`Input mint: ${inputMint.toBase58()}`)
  console.log(`Output mint: ${outputMint.toBase58()}`)
  console.log(`Amount: ${amount}`)

  return jupiter
    .computeRoutes({
      inputMint: a2b ? tokenA : tokenB,
      outputMint: a2b ? tokenB : tokenA,
      amount: JSBI.BigInt(amount.toString()),
      slippageBps,
      feeBps,
      forceFetch: true,
      onlyDirectRoutes: true,
      swapMode: SwapMode.ExactIn,
    })
    .then((res) => res.routesInfos)
    .catch((error) => {
      console.log('DEBUG: Failed to compute routes')
      console.error(error)
      return null
    })
}

export async function getRemainingAccountsFromJupiterRoutes(
  routes: RouteInfo[],
  jupiter: Jupiter,
  provider: AnchorProvider,
  user: PublicKey,
  maxSlippageFromBest = 0.05
) {
  if (!routes.length) return null

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

    const res = await jupiter.exchange({ routeInfo: route }).catch((err) => {
      console.log('DEBUG: Failed to set exchange')
      console.error(err)
      return null
    })
    if (!res) {
      console.log('DEBUG: Skip route with no exchange info')
      continue
    }

    // console.log(res.transactions.swapTransaction)
    const swapTransaction = res.transactions.swapTransaction as Transaction
    if (!swapTransaction.instructions) {
      console.log('DEBUG: Skipped route with no instructions')
      continue // skip VersionedTransaction
    }

    // let preInstructions: TransactionInstruction[] =
    //   swapTransaction.instructions.length > 1
    //     ? swapTransaction.instructions.slice(0, -1)
    //     : []

    let swapInstruction = swapTransaction.instructions.at(-1)
    if (!swapInstruction) {
      console.log('DEBUG: Skipped route with no swap instruction')
      continue
    }

    for (const key of swapInstruction.keys) {
      if (key.isSigner) {
        if (!key.pubkey.equals(user)) {
          console.log('DEBUG: Skipped route with unexpected signer')
          continue
        }
        key.isSigner = false
      }
    }

    // let postInstructions: TransactionInstruction[] = []

    if (swapInstruction.programId.toString() !== JUPITER_PROGRAM_ID) {
      console.log(
        `DEBUG: Skipped route with unexpected router ID: ${swapInstruction.programId.toString()}`
      )
      continue
    }

    if (swapInstruction.programId.toString() !== JUPITER_PROGRAM_ID) {
      console.log('DEBUG: Skipped route with unexpected router ID')
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
    console.log(accounts)

    return accounts
  }

  return null
}
