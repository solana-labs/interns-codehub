import { Box } from '@mui/material'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import PositionRenderCard, { PositionRenderCardSize } from '@/components/PositionRenderCard'
import { useAppDispatch, useAppSelector, useTokens } from '@/hooks'
import { fetchGlobalpool, selectGlobalpool } from '@/slices/globalpool'
import { UserLiquidityPosition } from '@/types/user'

type LiquidityPositionPreviewProps = {
	position: UserLiquidityPosition
}

export default function LiquidityPositionPreview({ position }: LiquidityPositionPreviewProps) {
	const dispatch = useAppDispatch()
	const globalpool = useAppSelector(selectGlobalpool(position.data.globalpool))

	const [tickSpacing, setTickSpacing] = useState<number>(64)
	const [currentPoolTick, setCurrentPoolTick] = useState<number>(0)

	const [tokenMintA, tokenMintB] = useTokens([globalpool?.tokenMintA, globalpool?.tokenMintB])

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
			<Link href={`/position/liquidity/${position.key.toBase58()}`}>
				<PositionRenderCard
					positionKey={position.key}
					tickLowerIndex={position.data.tickLowerIndex}
					tickUpperIndex={position.data.tickUpperIndex}
					tickCurrentIndex={currentPoolTick}
					tickSpacing={tickSpacing}
					amount={globalpool?.feeRate || 0}
					tokenA={tokenMintA}
					tokenB={tokenMintB}
					size={PositionRenderCardSize.SMALL}
				/>
			</Link>
		</Box>
	)
}