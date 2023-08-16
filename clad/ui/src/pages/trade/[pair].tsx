import { Box, Container, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { Token } from '@solflare-wallet/utl-sdk'

import { CandlestickChart, ChartCurrency, CurrencyStats } from '@/components/Chart'
import { ProvideLiquidityBox } from '@/components/ProvideLiquidityBox'
import { TradeBox } from '@/components/TradeBox'
import { TradableTicksBox } from '@/components/TradableTicksBox'
import { LOCALNET_CONNECTION } from '@/constants'
import { useAppSelector } from '@/hooks'
import { TradableTick, getTradableTicks } from '@/lib'
import { selectTokens } from '@/slices/generic'
import { selectGlobalpoolByMints } from '@/slices/globalpool'

export default function TradePairPage() {
  const router = useRouter()
  const { pair: candidatePair } = router.query

  const { connection } = process.env.NEXT_PUBLIC_SOLANA_TARGET === 'localnet' ? { connection: LOCALNET_CONNECTION } : useConnection()

  const supportedTokens = useAppSelector(selectTokens)

  const [tradableTicks, setTradableTicks] = useState<TradableTick[]>([])

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

  getTradableTicks

  const globalpool = useAppSelector(selectGlobalpoolByMints(baseToken?.address, quoteToken?.address))

  useEffect(() => {
    if (!globalpool || !baseToken || !quoteToken) return

    getTradableTicks({ globalpool, connection, baseToken, quoteToken })
      .then((ticks) => {
        console.log(ticks)
        setTradableTicks(ticks)
      })
  }, [globalpool, connection, baseToken, quoteToken])

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
      <TradableTicksBox
        baseToken={baseToken}
        quoteToken={quoteToken}
        ticks={tradableTicks}
        currentTick={globalpool.tickCurrentIndex}
        sx={{ mt: 8 }}
      />
    </Container>
  )
}