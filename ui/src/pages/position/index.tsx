import { Box, Container, Typography } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

import { TradePositionPreview } from '@/components/PositionPreview'
// import LiquidityPosition from '@/components/Positions/LiquidityPosition'
import { useAppDispatch, useAppSelector } from '@/hooks';
import { fetchTradePositionsByUser, selectTradePositions } from '@/slices/tradePosition';
import { fetchLiquidityPositionsByUser, selectLiquidityPositions } from '@/slices/liquidityPosition';

export default function PositionIndexPage() {
  const dispatch = useAppDispatch()
  const tradePositions = useAppSelector(selectTradePositions)
  const liquidityPositions = useAppSelector(selectLiquidityPositions)

  const { wallet: userWallet, publicKey: userPubkey } = useWallet()

  useEffect(() => {
    if (!userPubkey) return
    dispatch(fetchTradePositionsByUser(userPubkey))
    dispatch(fetchLiquidityPositionsByUser(userPubkey))
  }, [userPubkey])

  return (
    <Container maxWidth="lg">
      <Box>
        <Typography variant="h5" fontWeight="bold">Trade Positions</Typography>
        {tradePositions.length ? tradePositions.map((tradePosition) => (
          <TradePositionPreview key={tradePosition.key.toBase58()} position={tradePosition} />
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