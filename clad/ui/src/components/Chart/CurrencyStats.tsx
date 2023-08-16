// import { twMerge } from 'tailwind-merge'
import { Box, Typography } from '@mui/material'
import { Token } from '@solflare-wallet/utl-sdk'

import { formatNumber, tickToPrice } from '@/utils'
import { ExpirableGlobalpoolData } from '@/slices/globalpool'
import { useMemo } from 'react'

interface CurrencyStatsProps {
  baseToken: Token
  quoteToken: Token
  globalpool: ExpirableGlobalpoolData
}

export function CurrencyStats(props: CurrencyStatsProps) {
  const { baseToken, quoteToken, globalpool } = props

  const baseDecimals = baseToken.decimals || 9
  const quoteDecimals = quoteToken.decimals || 9

  const poolPrice = useMemo(() => {
    return tickToPrice(globalpool.tickCurrentIndex || 0, baseDecimals, quoteDecimals)
  }, [globalpool, baseDecimals, quoteDecimals])

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold">
        {formatNumber(poolPrice)} {quoteToken.symbol}/{baseToken.symbol}
      </Typography>
    </Box>
  )
}