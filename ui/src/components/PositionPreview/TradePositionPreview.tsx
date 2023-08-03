import { Box } from '@mui/material'
import BN from 'bn.js'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import PositionRenderCard, { PositionRenderCardSize } from '@/components/PositionRenderCard'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { tokenAddressToToken } from '@/lib/Token'
import { fetchGlobalpool, selectGlobalpool } from '@/slices/globalpool'
import { UserTradePosition } from '@/types/user'

type TradePositionPreviewProps = {
  position: UserTradePosition
}

export default function TradePositionPreview({ position }: TradePositionPreviewProps) {
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
    <Box display="inline-block" p={2}>
      <Link href={`/position/trade/${position.key.toBase58()}`}>
        <PositionRenderCard
          positionKey={position.key}
          tickLowerIndex={position.data.tickLowerIndex}
          tickUpperIndex={position.data.tickUpperIndex}
          tickOpenIndex={position.data.tickOpenIndex}
          tickCurrentIndex={currentPoolTick}
          tickSpacing={tickSpacing}
          amount={position.data.loanTokenSwapped.div(new BN(10 ** 6)).toString()}
          tokenA={{
            pubkey: position.data.tokenMintCollateral,
            symbol: tokenAddressToToken(position.data.tokenMintCollateral) || '',
            decimals: 8, // HNT (hard-coded for now)
          }}
          tokenB={{
            pubkey: position.data.tokenMintLoan,
            symbol: tokenAddressToToken(position.data.tokenMintLoan) || '',
            decimals: 6 // USDC = 6
          }}
          size={PositionRenderCardSize.SMALL}
        />
      </Link>
    </Box>
  )
}