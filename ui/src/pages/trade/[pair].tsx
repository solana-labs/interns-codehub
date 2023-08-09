import { Box, Container, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

import CandlestickChart from '@/components/Chart/CandlestickChart'
import TradeBox from '@/components/TradeBox'
import { strAsToken } from '@/lib/Token'

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
      <Stack direction={{ md: 'row' }} alignItems="stretch" justifyContent="space-between" spacing={{ xs: 3, md: 6 }}>
        <CandlestickChart
          baseToken={baseToken}
          quoteToken={quoteToken}
          sx={{ width: '100%' }}
        />
        <Stack justifyContent="flex-start" spacing={2}>
          <TradeBox baseToken={baseToken} quoteToken={quoteToken} />
          {/* <LeverageTradeBox
            baseToken={baseToken}
            quoteToken={quoteToken}
          />
          <SwapBox
            baseToken={baseToken}
            quoteToken={quoteToken}
          /> */}
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