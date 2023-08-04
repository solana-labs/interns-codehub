import { Box, Container, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

import CandlestickChart from '@/components/Chart/CandlestickChart'
import LeverageTradeBox from '@/components/LeverageTradeBox'
import { strAsToken } from '@/lib/Token'
import SwapBox from '@/components/SwapBox'

export default function TradePairPage() {
  const router = useRouter()
  const { pair: candidatePair } = router.query

  // Get base & quote token from dynamic URL
  const [baseToken, quoteToken] = useMemo(() => {
    let pair = Array.isArray(candidatePair) ? candidatePair[0] : candidatePair
    if (!pair) return [undefined, undefined]

    pair = Array.isArray(pair) ? pair[0] : pair
    if (!pair) return [undefined, undefined]

    const split = pair.split('-')
    if (split.length !== 2 || split.filter((x) => !x).length) return [undefined, undefined]

    return [strAsToken(split[0] as string), strAsToken(split[1] as string)]
  }, [candidatePair])

  if (!baseToken || !quoteToken) {
    return (
      <Container maxWidth='lg'>
        <Typography variant='h6' fontWeight='bold'>Invalid Trade Pair</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth='lg'>
      <Stack direction="row" alignItems="stretch" justifyContent="flex-start" spacing={6}>
        <CandlestickChart
          baseToken={baseToken}
          quoteToken={quoteToken}
          sx={{ width: '100%', maxWidth: { xs: '100%', sm: 550, md: 700 } }}
        />
        <Stack spacing={2} justifyContent="flex-end" py={3}>
          {/* <SwapTokens> */}
          <LeverageTradeBox
            baseToken={baseToken}
            quoteToken={quoteToken}
          />
          <SwapBox
            baseToken={baseToken}
            quoteToken={quoteToken}
          />
        </Stack>
      </Stack>
      {/* <ProvideLiquidity> */}
    </Container>
    // <TradeLayout className='pt-11'>
    //   <div>
    //     <TradeSidebar />
    //   </div>
    //   <div>
    //     <CandlestickChart comparisonCurrency={currency} token={token} />
    //     <Positions className='mt-8 ' />
    //   </div>
    // </TradeLayout>
  )
}