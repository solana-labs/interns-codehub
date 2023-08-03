import { Box } from '@mui/material'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import PositionRenderCard, { PositionRenderCardSize } from '@/components/PositionRenderCard'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { tokenAddressToToken } from '@/lib/Token'
import { fetchGlobalpool, selectGlobalpool } from '@/slices/globalpool'
import { UserLiquidityPosition } from '@/types/user'
import { PublicKey } from '@solana/web3.js'

type LiquidityPositionPreviewProps = {
	position: UserLiquidityPosition
}

export default function LiquidityPositionPreview({ position }: LiquidityPositionPreviewProps) {
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
			<Link href={`/position/liquidity/${position.key.toBase58()}`}>
				<PositionRenderCard
					positionKey={position.key}
					tickLowerIndex={position.data.tickLowerIndex}
					tickUpperIndex={position.data.tickUpperIndex}
					tickCurrentIndex={currentPoolTick}
					tickSpacing={tickSpacing}
					amount={globalpool?.feeRate || 0}
					tokenA={{
						pubkey: globalpool?.tokenMintA || new PublicKey(''),
						symbol: tokenAddressToToken(globalpool?.tokenMintA || '') || '',
						decimals: 8, // HNT (hard-coded for now)
					}}
					tokenB={{
						pubkey: globalpool?.tokenMintB || new PublicKey(''),
						symbol: tokenAddressToToken(globalpool?.tokenMintB || '') || '',
						decimals: 6 // USDC = 6
					}}
					size={PositionRenderCardSize.SMALL}
				/>
			</Link>
		</Box>
	)
}