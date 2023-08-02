import { Box, Typography } from '@mui/material'

import TradePositionRender from '@/components/Positions/TradePositionRender'
import { UserTradePosition } from '@/types/user'

type TradePositionProps = {
  position: UserTradePosition
}

export default function TradePosition({ position }: TradePositionProps) {
  return (
    <Box key={position.key.toBase58()}>
      <TradePositionRender position={position} />
      <Typography variant="body1">Key: {position.key.toBase58()}</Typography>
      <Typography variant="body1">Borrowed: {position.data.loanTokenSwapped.toString()}</Typography>
      <Typography variant="body1">Collateral: {position.data.collateralAmount.toString()}</Typography>
    </Box>
  )
}