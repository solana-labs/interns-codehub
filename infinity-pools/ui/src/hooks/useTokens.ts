import { PublicKey } from '@solana/web3.js'
import { Token } from '@solflare-wallet/utl-sdk'
import { useMemo } from 'react'

import { useAppDispatch, useAppSelector } from '@/hooks'
import { fetchTokens, selectTokens } from '@/slices/generic'

export function useTokens(mints: (string | PublicKey | undefined)[]): Token[] {
  const dispatch = useAppDispatch()
  const cachedTokens = useAppSelector(selectTokens)

  // TODO: Better cache
  return useMemo(() => {
    if (!mints.length) return []

    let quit = false
    let _mints = mints.map((m) => {
      if (typeof m === 'string') return m
      if (m instanceof PublicKey) return m.toString()
      quit = true
      return null
    }).filter((m) => !!m) as string[]

    if (quit) return []

    let shouldFetch = false
    const tokens = _mints.map((m) => {
      if (!cachedTokens[m]) {
        shouldFetch = true
        return null
      }
      return cachedTokens[m]
    }).filter((t) => !!t) as Token[]

    if (shouldFetch) {
      dispatch(fetchTokens({ mints }))
      return [] // don't return if we need to fetch (wait until all tokens are fetched & cached)
    }

    return tokens
  }, [mints, cachedTokens])
}