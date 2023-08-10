import { Box, SxProps } from '@mui/material'
import { Token } from '@solflare-wallet/utl-sdk'
import dynamic from 'next/dynamic'

import { useMemo } from 'react'

// @ts-ignore
const TradingViewWidget = dynamic<any>(import('react-tradingview-widget'), {
  ssr: false,
})

interface CandlestickChartProps {
  baseToken: Token
  quoteToken: Token
  sx?: SxProps
}

export function CandlestickChart(props: CandlestickChartProps) {
  const { baseToken, quoteToken } = props

  const pairSymbol = useMemo(() => {
    // TradingView likes USD for USDC (and no dash)
    const _quoteToken = quoteToken.symbol === 'USDC' ? 'USD' : quoteToken.symbol
    return `${baseToken.symbol}${_quoteToken}`
  }, [baseToken, quoteToken])

  if (!pairSymbol || pairSymbol.trim() === '') return (<></>)

  return (
    <Box height={{ xs: 350, sm: 450, md: 500 }} width="100%" sx={props.sx}>
      <TradingViewWidget autosize symbol={pairSymbol} theme='Light' />
      <Box>
        <a
          href={`https://www.tradingview.com/symbols/${pairSymbol}/?exchange=CRYPTO`}
          className='text-xs underline'
          target="_blank"
        >
          {baseToken.symbol} stock chart
        </a>
        <span className='text-xs'> by TradingView</span>
      </Box>
    </Box>
  )
}
