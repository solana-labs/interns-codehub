import { Box, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import TradePositionRender from '@/components/Positions/TradePositionRender'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { UserTradePosition } from '@/types/user'
import { fetchGlobalpool, selectGlobalpool } from '@/slices/globalpool'
import { tokenAddressToToken } from '@/lib/Token'

type TradePositionProps = {
  position: UserTradePosition
}

export default function TradePosition({ position }: TradePositionProps) {
  const dispatch = useAppDispatch()
  const globalpool = useAppSelector(selectGlobalpool(position.data.globalpool))

  const [tickSpacing, setTickSpacing] = useState<number>(64)
  const [currentPoolTick, setCurrentPoolTick] = useState<number>(0)

  useEffect(() => {
    if (!position) return
    dispatch(fetchGlobalpool(position.data.globalpool))
  }, [position])

  useEffect(() => {
    if (!globalpool) return
    setTickSpacing(globalpool.tickSpacing)
    setCurrentPoolTick(globalpool.tickCurrentIndex)
  }, [globalpool])

  return (
    <Box key={position.key.toBase58()}>
      <TradePositionRender
        positionKey={position.key}
        tickLowerIndex={position.data.tickLowerIndex}
        tickUpperIndex={position.data.tickUpperIndex}
        tickCurrentIndex={currentPoolTick}
        tickSpacing={tickSpacing}
        loanTokenSwapped={position.data.loanTokenSwapped}
        tokenCollateral={{
          pubkey: position.data.tokenMintCollateral,
          symbol: tokenAddressToToken(position.data.tokenMintCollateral) || '',
          decimals: 9
        }}
        tokenLoan={{
          pubkey: position.data.tokenMintLoan,
          symbol: tokenAddressToToken(position.data.tokenMintLoan) || '',
          decimals: 9
        }}
      />
      <Typography variant="body1">Key: {position.key.toBase58()}</Typography>
      <Typography variant="body1">Borrowed: {position.data.loanTokenSwapped.toString()}</Typography>
      <Typography variant="body1">Collateral: {position.data.collateralAmount.toString()}</Typography>
    </Box>
  )
}