'use client'

import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import BN from 'bn.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/router'

import PositionRenderCard, { PositionRenderCardSize } from '@/components/PositionRenderCard'
import ShadowedBox from '@/components/ShadowedBox'
import { LOCALNET_CONNECTION } from '@/constants'
import { useAppDispatch, useAppSelector, useCladProgram } from '@/hooks'
// import closeLiquidityPosition from '@/lib/closeLiquidityPosition'
import { sortObjectByQuotePriority, tokenAddressToToken } from '@/lib/Token'
import { fetchGlobalpool, selectGlobalpool } from '@/slices/globalpool'
import { selectLiquidityPosition } from '@/slices/liquidityPosition'
import { isBase58, tickToPrice } from '@/utils'
import { PublicKey } from '@solana/web3.js'

export default function LiquidityPosition() {
  const dispatch = useAppDispatch()
  const router = useRouter()

  // react-wallet doesn't connect to localnet despite changing the browser wallet RPC,
  // so we manually set it to localnet here (and other places where we use connection)
  // const { connection } = useConnection()
  const connection = LOCALNET_CONNECTION

  const wallet = useAnchorWallet()
  const program = useCladProgram(connection)

  const { position: candidatePositionKey } = router.query

  const position = useAppSelector(selectLiquidityPosition(candidatePositionKey as string || ''))
  const globalpool = useAppSelector(selectGlobalpool(position ? position.data.globalpool : ''))

  const [tickSpacing, setTickSpacing] = useState<number>(64)
  const [currentPoolTick, setCurrentPoolTick] = useState<number>(0)

  // Order doesn't matter because we sort (with priority for some quote tokens)

  const [baseToken, quoteToken] = useMemo(() => {
    if (!position) return [undefined, undefined]

    const tokenA = {
      pubkey: globalpool?.tokenMintA || new PublicKey(''),
      symbol: tokenAddressToToken(globalpool?.tokenMintA || '') || '',
      decimals: 8, // HNT (hard-coded for now)
      fixedTo: 6,
    }

    const tokenB = {
      pubkey: globalpool?.tokenMintB || new PublicKey(''),
      symbol: tokenAddressToToken(globalpool?.tokenMintB || '') || '',
      decimals: 6, // USDC (hard-coded for now)
      fixedTo: 2,
    }

    return [tokenA, tokenB].sort(sortObjectByQuotePriority('pubkey'))
  }, [position])

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
                  {tickToPrice(globalpool?.tickCurrentIndex || 0, baseToken?.decimals, quoteToken?.decimals).toFixed(quoteToken?.fixedTo)}
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
                    {tickToPrice(position.data.tickLowerIndex, baseToken?.decimals, quoteToken?.decimals).toFixed(quoteToken?.fixedTo)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Upper Price</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {tickToPrice(position.data.tickUpperIndex, baseToken?.decimals, quoteToken?.decimals).toFixed(quoteToken?.fixedTo)}
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
            <Box py={1}>
              <Typography variant="body1">PnL</Typography>
            </Box>
          </ShadowedBox>
          <Button variant="outlined" color="error" onClick={closePositionHandler}>Close Position</Button>
        </Stack>
      </Stack>
    </Container>
  )
}