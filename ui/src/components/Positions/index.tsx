import { Box, Container, Typography } from '@mui/material'

import TradePosition from '@/components/Positions/TradePosition'
// import LiquidityPosition from '@/components/Positions/LiquidityPosition'
import { UserLiquidityPosition, UserTradePosition } from '@/types/user'

interface PositionsProps {
  tradePositions: UserTradePosition[]
  liquidityPositions: UserLiquidityPosition[]
}

export default function Positions(props: PositionsProps) {
  return (
    <Container maxWidth="lg">
      <Box>
        <Typography variant="h5">Trade Positions</Typography>
        {props.tradePositions.length ? props.tradePositions.map((tradePosition) => (
          <TradePosition key={tradePosition.key.toBase58()} position={tradePosition} />
        )) : (
          <Typography variant="body1">No trade positions</Typography>
        )}
      </Box>
      <Box mt={4}>
        <Typography variant="h5">Liquidity Positions</Typography>
      </Box>
    </Container>
  )
}