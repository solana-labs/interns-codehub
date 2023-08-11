import { Box, Container, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { Token } from '@solflare-wallet/utl-sdk'

import { CandlestickChart, ChartCurrency, CurrencyStats } from '@/components/Chart'
import { ProvideLiquidityBox } from '@/components/ProvideLiquidityBox'
import { TradeBox } from '@/components/TradeBox'
import { useAppSelector } from '@/hooks'
import { selectTokens } from '@/slices/generic'
import { selectGlobalpoolByMints } from '@/slices/globalpool'

export default function TradePairPage() {
  const router = useRouter()
  const { pair: candidatePair } = router.query

  const supportedTokens = useAppSelector(selectTokens)
  // console.log(supportedTokens)

  // Get base & quote token from dynamic URL
  const [baseToken, quoteToken] = useMemo(() => {
    let pair = Array.isArray(candidatePair) ? candidatePair[0] : candidatePair
    if (!pair) return [undefined, undefined]

    pair = Array.isArray(pair) ? pair[0] : pair
    if (!pair) return [undefined, undefined]

    const split = pair.split('-')
    if (split.length !== 2 || split.filter((x) => !x).length) return [undefined, undefined]

    // Find base & quote token from tokens list using the symbol (from URL)
    let baseToken: Token | undefined 
    let quoteToken: Token | undefined
    Object.values(supportedTokens).forEach((token) => {
      if (token.symbol === split[0]) baseToken = token
      else if (token.symbol === split[1]) quoteToken = token
    })

    return [baseToken, quoteToken]
  }, [candidatePair, supportedTokens])

  const globalpool = useAppSelector(selectGlobalpoolByMints(baseToken?.address, quoteToken?.address))

  if (!baseToken || !quoteToken || !globalpool) {
    return (
      <Container maxWidth='lg'>
        <Typography variant='h6' fontWeight='bold'>Invalid Trade Pair</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth='lg'>
      <Stack direction={{ md: 'row' }} alignItems="stretch" justifyContent="space-between" spacing={{ xs: 3, md: 6 }}>
        <Box width="100%">
          <Stack direction="row" spacing={6} alignItems="center" justifyContent="space-between" mb={3}>
            <ChartCurrency
              baseToken={baseToken}
              quoteToken={quoteToken}
              supportedTokens={supportedTokens}
            />
            <CurrencyStats
              baseToken={baseToken}
              quoteToken={quoteToken}
              globalpool={globalpool}
            />
          </Stack>
          <CandlestickChart
            baseToken={baseToken}
            quoteToken={quoteToken}
            sx={{ width: '100%' }}
          />
        </Box>
        <TradeBox baseToken={baseToken} quoteToken={quoteToken} globalpool={globalpool} />
      </Stack>
      <ProvideLiquidityBox
        baseToken={baseToken}
        quoteToken={quoteToken}
        globalpool={globalpool}
        sx={{ mt: 8 }}
      />
    </Container>
  )
}