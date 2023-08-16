import { Container, Stack, Typography } from '@mui/material'
import { Token } from '@solflare-wallet/utl-sdk'
import { Metadata } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

import { TokenClickStack } from '@/components/TokenClickStack'
import { useAppSelector } from '@/hooks'
import { selectTokens } from '@/slices/generic'
import { selectGlobalpools } from '@/slices/globalpool'
import { parseAllTokensFromPools } from '@/utils/token'

export const metadata: Metadata = {
  title: 'Clad Finance',
  description: 'Leverage trade any coins oracle-free!',
}

export default function IndexPage() {
  const router = useRouter()
  const globalpools = useAppSelector(selectGlobalpools)
  const supportedTokens = useAppSelector(selectTokens)

  // Get token-pair of all globalpools
  const tokenList = useMemo(() => {
    if (!globalpools || !supportedTokens) return [] as { base: Token, quote: Token }[]
    return parseAllTokensFromPools(globalpools, supportedTokens)
  }, [globalpools, supportedTokens])

  return (
    <Container maxWidth="lg">
      <Typography variant="h4">Trade, swap, or provide liquidity for any tokens!</Typography>
      <Typography variant="h5" pt={3} fontWeight="bold">Available Pools</Typography>
      <Stack direction="column" spacing={3} pt={3}>
        {tokenList.map((tokenPair) => {
          const { base: baseToken, quote: quoteToken } = tokenPair
          return (
            <TokenClickStack
              key={baseToken.symbol + quoteToken.symbol}
              direction="row"
              spacing={2}
              alignItems="center"
              onClick={() => {
                const newUrl = `/trade/${baseToken.symbol}-${quoteToken.symbol}`
                router.push(newUrl) // push if not already on the page
              }}
            >
              <Image src={baseToken.logoURI || '/'} alt={baseToken.symbol} width={40} height={40} />
              <Typography variant="h6" fontWeight="bold">{baseToken.symbol}/{quoteToken.symbol}</Typography>
            </TokenClickStack>
          )
        })}
      </Stack>
    </Container>
  )
}
