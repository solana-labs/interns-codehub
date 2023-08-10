'use client'

import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { Token } from '@solflare-wallet/utl-sdk'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import PositionRenderCard, { PositionRenderCardSize } from '@/components/PositionRenderCard'
import { ShadowedBox } from '@/components/ShadowedBox'
import { LOCALNET_CONNECTION } from '@/constants'
import { useAppDispatch, useAppSelector, useCladProgram } from '@/hooks'
import { fetchGlobalpool, selectGlobalpool } from '@/slices/globalpool'
import { selectLiquidityPosition } from '@/slices/liquidityPosition'
import { formatNumber, isBase58, tickToPrice } from '@/utils'

interface LiquidityPositionProps {
  baseToken: Token
  quoteToken: Token
}

export function LiquidityPosition(props: LiquidityPositionProps) {
  const { baseToken, quoteToken } = props

  const dispatch = useAppDispatch()
  const router = useRouter()

  // react-wallet doesn't connect to localnet despite changing the browser wallet RPC,
  // so we manually set it to localnet here (and other places where we use connection)
  const { connection } = process.env.NEXT_PUBLIC_SOLANA_TARGET === 'localnet' ? { connection: LOCALNET_CONNECTION } : useConnection()

  const wallet = useAnchorWallet()
  const program = useCladProgram(connection)

  const { position: candidatePositionKey } = router.query

  const position = useAppSelector(selectLiquidityPosition(candidatePositionKey as string || ''))
  const globalpool = useAppSelector(selectGlobalpool(position ? position.data.globalpool : ''))

  const [tickSpacing, setTickSpacing] = useState<number>(64)
  const [currentPoolTick, setCurrentPoolTick] = useState<number>(0)

  const closePositionHandler = useCallback(async () => {
    if (!connection || !position || !globalpool || !wallet || !program) return

    // console.log('close position!')
    // console.log('position authority', wallet.publicKey.toBase58())

    // try {
    //   await closeLiquidityPosition({
    //     position,
    //     positionAuthority: wallet.publicKey,
    //     globalpool,
    //     globalpoolKey: position.data.globalpool,
    //     program,
    //     wallet,
    //   })
    // } catch (err) {
    //   console.error(err)
    //   toast('Failed to close position', { type: 'error' })
    // }
  }, [connection, position, wallet, globalpool, program])

  useEffect(() => {
    if (!position) return
    dispatch(fetchGlobalpool(position.data.globalpool))
  }, [position])

  useEffect(() => {
    if (!globalpool) return
    setTickSpacing(globalpool.tickSpacing)
    setCurrentPoolTick(globalpool.tickCurrentIndex)
  }, [globalpool])

  if (!candidatePositionKey || typeof candidatePositionKey !== 'string' || !isBase58(candidatePositionKey)) {
    console.error('invalid position key in url')
    // router.push('/position')
    return (<></>)
  }

  if (!position) {
    console.error('position not found')
    // router.push('/position')
    return (
      <Container maxWidth="lg">
        <Typography variant="h6" fontWeight="bold">Position not found!</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Stack direction="row" alignItems="center" spacing={{ xs: 4, sm: 6, md: 8 }}>
        <PositionRenderCard
          positionKey={position.key}
          tickLowerIndex={position.data.tickLowerIndex}
          tickUpperIndex={position.data.tickUpperIndex}
          tickCurrentIndex={currentPoolTick}
          tickSpacing={tickSpacing}
          amount={globalpool?.feeRate || 0}
          tokenA={baseToken}
          tokenB={quoteToken}
          size={PositionRenderCardSize.BIG}
        />
        <Stack spacing={3}>
          <ShadowedBox>
            <Typography variant="h6" fontWeight="bold">Pool Stats</Typography>
            <Stack direction="row" spacing={2}>
              <Box>
                <Typography variant="caption">Current Price</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatNumber(tickToPrice(globalpool?.tickCurrentIndex || 0, baseToken.decimals || 9, quoteToken.decimals || 9))}
                </Typography>
              </Box>
            </Stack>
          </ShadowedBox>
          <ShadowedBox>
            <Typography variant="h6" fontWeight="bold">Position Stats</Typography>
            <Box py={1} borderBottom="1px solid #ccc">
              <Typography variant="body1" fontWeight="bold">Range</Typography>
              <Stack direction="row" spacing={2}>
                <Box>
                  <Typography variant="caption">Lower Price</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(tickToPrice(position.data.tickLowerIndex, baseToken.decimals || 9, quoteToken.decimals || 9))}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Upper Price</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(tickToPrice(position.data.tickUpperIndex, baseToken.decimals || 9, quoteToken.decimals || 9))}
                  </Typography>
                </Box>
              </Stack>
            </Box>
            <Box py={1} borderBottom="1px solid #ccc">
              <Typography variant="body1">Liquidity</Typography>
              <Typography variant="body1" fontWeight="bold">
                {position.data.liquidity.toString()}
              </Typography>
            </Box>
          </ShadowedBox>
          <Button variant="outlined" color="error" onClick={closePositionHandler}>Close Position</Button>
        </Stack>
      </Stack>
    </Container>
  )
}