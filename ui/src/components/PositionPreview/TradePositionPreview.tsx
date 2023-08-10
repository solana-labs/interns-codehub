import { Box } from '@mui/material'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import PositionRenderCard, { PositionRenderCardSize } from '@/components/PositionRenderCard'
import { useAppDispatch, useAppSelector, useTokens } from '@/hooks'
import { fetchGlobalpool, selectGlobalpool } from '@/slices/globalpool'
import { UserTradePosition } from '@/types/user'
import { numScaledFromDecimals, strOrPubkeyToPubkey, strOrPubkeyToString } from '@/utils'

type TradePositionPreviewProps = {
  position: UserTradePosition
}

export default function TradePositionPreview({ position }: TradePositionPreviewProps) {
  const dispatch = useAppDispatch()
  const globalpool = useAppSelector(selectGlobalpool(position.data.globalpool))

  const [tickSpacing, setTickSpacing] = useState<number>(64)
  const [currentPoolTick, setCurrentPoolTick] = useState<number>(0)

  const [tokenCollateral, tokenLoan] = useTokens([position?.data.tokenMintCollateral, position?.data.tokenMintLoan])

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
    <Box display="inline-block" p={2}>
      <Link href={`/position/trade/${strOrPubkeyToString(position.key)}`}>
        <PositionRenderCard
          positionKey={strOrPubkeyToPubkey(position.key)}
          tickLowerIndex={position.data.tickLowerIndex}
          tickUpperIndex={position.data.tickUpperIndex}
          tickOpenIndex={position.data.tickOpenIndex}
          tickCurrentIndex={currentPoolTick}
          tickSpacing={tickSpacing}
          amount={numScaledFromDecimals(position.data.loanTokenSwapped, tokenLoan?.decimals || 9)}
          tokenA={tokenCollateral}
          tokenB={tokenLoan}
          size={PositionRenderCardSize.SMALL}
        />
      </Link>
    </Box>
  )
}