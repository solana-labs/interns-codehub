import { Box, Container, Typography } from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import { useEffect } from "react"

import { LiquidityPositionPreview, TradePositionPreview } from '@/components/PositionPreview'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { fetchTradePositionsByUser, selectTradePositions } from '@/slices/tradePosition'
import { fetchLiquidityPositionsByUser, selectLiquidityPositions } from '@/slices/liquidityPosition'
import { strOrPubkeyToString } from "@/utils"

export default function PositionIndexPage() {
  const dispatch = useAppDispatch()
  const tradePositions = useAppSelector(selectTradePositions)
  const liquidityPositions = useAppSelector(selectLiquidityPositions)

  const { publicKey: userPubkey } = useWallet()

  useEffect(() => {
    if (!userPubkey) return
    dispatch(fetchTradePositionsByUser(userPubkey))
    dispatch(fetchLiquidityPositionsByUser(userPubkey))
  }, [userPubkey])

  console.log(tradePositions)

  return (
    <Container maxWidth="lg">
      <Box>
        <Typography variant="h5" fontWeight="bold" py={1} px={2}>Trade Positions</Typography>
        {tradePositions.length ? tradePositions.map((tradePosition) => (
          <TradePositionPreview key={strOrPubkeyToString(tradePosition.key)} position={tradePosition} />
        )) : (
          <Typography variant="body1">No trade positions</Typography>
        )}
      </Box>
      <Box mt={4}>
        <Typography variant="h5" fontWeight="bold" py={1} px={2}>Liquidity Positions</Typography>
        {liquidityPositions.length ? liquidityPositions.map((liquidityPosition) => (
          <LiquidityPositionPreview key={strOrPubkeyToString(liquidityPosition.key)} position={liquidityPosition} />
        )) : (
          <Typography variant="body1">No trade positions</Typography>
        )}
      </Box>
    </Container>
  )
}