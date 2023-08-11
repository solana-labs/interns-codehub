import { Box, type SxProps, TextField, Typography, Stack, Button } from '@mui/material'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { Token } from '@solflare-wallet/utl-sdk'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ShadowedBox } from '@/components/ShadowedBox'
import { LOCALNET_CONNECTION } from '@/constants'
import { useCladProgram } from '@/hooks'
import { openLiquidityPosition } from '@/lib'
import { ExpirableGlobalpoolData } from '@/slices/globalpool'
import { estimateLiquidityFromTokenAmounts, priceToNearestTick, toTokenAmount } from '@/utils'

interface ProvideLiquidityBoxProps {
  baseToken: Token
  quoteToken: Token
  globalpool: ExpirableGlobalpoolData
  sx?: SxProps
}

export function ProvideLiquidityBox(props: ProvideLiquidityBoxProps) {
  const {
    baseToken,
    quoteToken,
    globalpool
  } = props

  const baseDecimals = baseToken.decimals || 9
  const quoteDecimals = quoteToken.decimals || 9
  const tickSpacing = globalpool.tickSpacing || 64

  const { connection } = process.env.NEXT_PUBLIC_SOLANA_TARGET === 'localnet' ? { connection: LOCALNET_CONNECTION } : useConnection()
  const wallet = useAnchorWallet()
  const program = useCladProgram(connection)

  const [liqRangePrice, setLiqRangePrice] = useState<{ lower: number, upper: number }>({ lower: 0, upper: 0 })
  const [liqTokenAmount, setLiqTokenAmount] = useState<{ base: number, quote: number }>({ base: 0, quote: 0 })

  const [isOpeningPosition, setIsOpeningPosition] = useState(false)

  const liqRangeTicks = useMemo(() => {
    if (!(liqRangePrice.lower || liqRangePrice.upper)) return { lower: 0, upper: 0 }
    const lowerTick = priceToNearestTick(liqRangePrice.lower, tickSpacing, baseDecimals, quoteDecimals)
    const upperTick = priceToNearestTick(liqRangePrice.upper, tickSpacing, baseDecimals, quoteDecimals)
    return { lower: lowerTick, upper: upperTick }
  }, [liqRangePrice])

  const handleOpenPosition = useCallback(async () => {
    // last is nor of liqTokenAmount
    if (!wallet || !program || !liqRangePrice.lower || !liqRangePrice.upper || !(liqTokenAmount.base || liqTokenAmount.quote)) return
    setIsOpeningPosition(true)

    const tickLowerIndex = priceToNearestTick(liqRangePrice.lower, tickSpacing, baseDecimals, quoteDecimals)
    const tickUpperIndex = priceToNearestTick(liqRangePrice.upper, tickSpacing, baseDecimals, quoteDecimals)

    const liquidityAmount = estimateLiquidityFromTokenAmounts(
      globalpool.tickCurrentIndex,
      tickLowerIndex,
      tickUpperIndex,
      toTokenAmount(liqTokenAmount.base, liqTokenAmount.quote)
    )
    console.log('liquidity position liquidityAmount', liquidityAmount.toString())

    try {
      await openLiquidityPosition({
        tickLowerIndex,
        tickUpperIndex,
        liquidityAmount,
        positionAuthority: wallet.publicKey,
        globalpool,
        program,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsOpeningPosition(false)
    }
  }, [liqRangePrice, liqTokenAmount, wallet, program])

  useEffect(() => {
    // (last part is NOR, so if either is 0, it will return true)
    if (!liqRangePrice.lower || !liqRangePrice.upper || !(liqTokenAmount.base || liqTokenAmount.quote)) return

    const lowerTick = priceToNearestTick(liqRangePrice.lower, tickSpacing, baseDecimals, quoteDecimals)
    const upperTick = priceToNearestTick(liqRangePrice.upper, tickSpacing, baseDecimals, quoteDecimals)
  }, [liqRangePrice, liqTokenAmount])

  return (
    <ShadowedBox width="100%" sx={{ py: 4, px: 5, ...props.sx }}>
      <Typography variant="h6" fontWeight="bold">Provide Liquidity</Typography>
      <Stack direction="row" spacing={2} alignItems="stretch" justifyContent="flex-start" mt={2}>
        <Box>
          <Box>
            <Typography variant="body1" fontWeight="bold" color="#999" pb={1}>Range - Lower Price</Typography>
            <TextField
              type="number"
              variant="outlined"
              color="secondary"
              label=""
              onChange={(e: any) => setLiqRangePrice({ lower: parseFloat(e.target.value) || 0, upper: liqRangePrice.upper })}
              value={liqRangePrice.lower}
              inputProps={{ min: 0, max: liqRangePrice.upper }}
              required
              fullWidth
            />
            <Typography variant="caption" fontWeight="bold" color="#999">
              &#8776; {liqRangePrice.lower ? liqRangeTicks.lower : '-'} Tick
            </Typography>
          </Box>
          <Box pt={2}>
            <Typography variant="body1" fontWeight="bold" color="#999" pb={1}>Range - Upper Price</Typography>
            <TextField
              type="number"
              variant="outlined"
              color="secondary"
              label=""
              onChange={(e: any) => setLiqRangePrice({ lower: liqRangePrice.lower, upper: parseFloat(e.target.value) || 0 })}
              value={liqRangePrice.upper}
              inputProps={{ min: liqRangePrice.lower }}
              required
              fullWidth
            />
            <Typography variant="caption" fontWeight="bold" color="#999">
              &#8776; {liqRangePrice.upper ? liqRangeTicks.upper : '-'} Tick
            </Typography>
          </Box>
        </Box>

        <Box>
          <Box>
            <Typography variant="body1" fontWeight="bold" color="#999" pb={1}>{baseToken.symbol} amount</Typography>
            <TextField
              type="number"
              variant="outlined"
              color="secondary"
              label=""
              onChange={(e: any) => setLiqTokenAmount({ base: parseFloat(e.target.value) || 0, quote: liqTokenAmount.quote })}
              value={liqTokenAmount.base}
              inputProps={{ min: 0 }}
              required
              fullWidth
            />
            <Typography variant="caption">&nbsp;</Typography>
          </Box>
          <Box pt={2}>
            <Typography variant="body1" fontWeight="bold" color="#999" pb={1}>{quoteToken.symbol} amount</Typography>
            <TextField
              type="number"
              variant="outlined"
              color="secondary"
              label=""
              onChange={(e: any) => setLiqTokenAmount({ base: liqTokenAmount.base, quote: parseFloat(e.target.value) || 0 })}
              value={liqTokenAmount.quote}
              inputProps={{ min: 0 }}
              required
              fullWidth
            />
            <Typography variant="caption">&nbsp;</Typography>
          </Box>

          <Box pt={3}>
            <Button variant="outlined" onClick={handleOpenPosition} disabled={isOpeningPosition} fullWidth>Open Liquidity Position</Button>
          </Box>
          {/* {errorTickRange && <Typography variant="caption" color="red" pt={1}>{errorTickRange}</Typography>} */}
        </Box>
      </Stack>
    </ShadowedBox>
  )
}