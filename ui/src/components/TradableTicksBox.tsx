import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  type SxProps,
  Box
} from '@mui/material'
import { Token } from '@solflare-wallet/utl-sdk'
import BN from 'bn.js'
import Decimal from 'decimal.js'

import { TradableTick } from '@/lib'
import { estimateLiquidityForTokenA, formatNumber, getTokenAmountsFromLiquidity, tickToPrice } from '@/utils'
import { PriceMath } from '@orca-so/whirlpools-sdk'

export interface TradableTicksBoxProps {
  ticks: TradableTick[]
  currentTick: number
  baseToken: Token
  quoteToken: Token
  sx?: SxProps
}

export function TradableTicksBox(props: TradableTicksBoxProps) {
  const { ticks, currentTick, baseToken, quoteToken } = props

  const baseDecimals = baseToken.decimals || 9
  const quoteDecimals = quoteToken.decimals || 9
  const sqrtP = PriceMath.tickIndexToSqrtPriceX64(currentTick)

  return (
    <Box sx={props.sx}>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Tick</TableCell>
              <TableCell align="right">Price ({quoteToken.symbol})</TableCell>
              <TableCell align="right">Liquidity Available</TableCell>
              <TableCell align="right">Liquidity Borrowed</TableCell>
              <TableCell align="right">Utilization</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ticks.map((tick) => {
              const isTokenA = tick.tickIndex > currentTick
              const tickPrice = tickToPrice(tick.tickIndex, baseDecimals, quoteDecimals)

              const decimalExpo = new BN(10 ** (isTokenA ? baseDecimals : quoteDecimals))
              const lowerTick = isTokenA ? currentTick : tick.tickIndex
              const upperTick = isTokenA ? tick.tickIndex : currentTick

              const calcGross = getTokenAmountsFromLiquidity(
                tick.liquidityGross,
                sqrtP,
                lowerTick,
                upperTick,
                !isTokenA
              )

              const calcBorrowed = getTokenAmountsFromLiquidity(
                tick.liquidityBorrowed,
                sqrtP,
                lowerTick,
                upperTick,
                !isTokenA
              )

              const tokenAmountGrossExpo = isTokenA ? calcGross.tokenA : calcGross.tokenB
              const tokenAmountGross = new Decimal(tokenAmountGrossExpo.div(decimalExpo).toString())

              const tokenAmountBorrowedExpo = isTokenA ? calcBorrowed.tokenA : calcBorrowed.tokenB
              const tokenAmountBorrowed = new Decimal(tokenAmountBorrowedExpo.div(decimalExpo).toString())

              return (
                <TableRow
                  key={tick.tickIndex}
                  sx={{
                    bgcolor: isTokenA ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 0, 0.1)',
                    '&:last-child td, &:last-child th': { border: 0 }
                  }}
                >
                  <TableCell component="th" scope="row">{tick.tickIndex}</TableCell>
                  <TableCell align="right">
                    {formatNumber(tickPrice)}
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(tokenAmountGross)} {isTokenA ? baseToken.symbol : quoteToken.symbol}
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(tokenAmountBorrowed)} {isTokenA ? baseToken.symbol : quoteToken.symbol}
                  </TableCell>
                  <TableCell align="right">
                    {new Decimal(tokenAmountBorrowed.mul(10_000).div(tokenAmountGross).toString()).div(100).toFixed(2)}%
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}