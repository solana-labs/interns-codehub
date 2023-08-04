import { Box, Stack, SxProps } from '@mui/material'
import dynamic from 'next/dynamic'

import ChartCurrency from '@/components/Chart/ChartCurrency'
import DailyStats from '@/components/Chart/DailyStats'
import { TokenE } from '@/lib/Token'
import { useEffect, useState } from 'react'

// @ts-ignore
const TradingViewWidget = dynamic<any>(import('react-tradingview-widget'), {
  ssr: false,
})

interface CandlestickChartProps {
  className?: string
  sx?: SxProps
  baseToken?: TokenE
  quoteToken?: TokenE
}

export default function CandlestickChart(props: CandlestickChartProps) {
  const { baseToken, quoteToken } = props
  const [pairSymbol, setPairSymbol] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!baseToken || !quoteToken) return

    // TradingView likes USD for USDC (and no dash)
    const _quoteToken = quoteToken === TokenE.USDC ? 'USD' : quoteToken
    setPairSymbol(`${baseToken}${_quoteToken}`)
  }, [baseToken, quoteToken])

  if (!pairSymbol || pairSymbol.trim() === '') return (<></>)

  return (
    <Box className={props.className} sx={props.sx}>
      <Stack direction="column" spacing="4" justifyContent="center" mb={6}>
        <ChartCurrency
          baseToken={baseToken}
          quoteToken={quoteToken}
        />
        <DailyStats
          className="ml-12"
          baseToken={baseToken}
          quoteToken={quoteToken}
        />
      </Stack>
      {/*  height={{ xs: 350, sm: 450, md: 500 }} */}
      <Box> 
        <TradingViewWidget autosize symbol={pairSymbol} theme='Light' />
        <Box>
          <a
            href={`https://www.tradingview.com/symbols/${pairSymbol}/?exchange=CRYPTO`}
            className='text-xs underline'
            target="_blank"
          >
            {baseToken} stock chart
          </a>
          <span className='text-xs'> by TradingView</span>
        </Box>
      </Box>
    </Box>
  )
}
