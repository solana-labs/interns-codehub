import { Box, Typography } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from '@/hooks';
import { fetchTradePositionsByUser, selectTradePositions } from '@/slices/tradePosition';
import { fetchLiquidityPositionsByUser, selectLiquidityPositions } from '@/slices/liquidityPosition';

import Positions from '@/components/Positions'

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
    <Box>
      <Positions tradePositions={tradePositions} liquidityPositions={liquidityPositions} />
    </Box>
  )
}