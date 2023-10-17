import { PublicKey } from "@solana/web3.js"

import { LiquidityPositionData, TradePositionData } from "@/types/accounts"

export type UserTradePosition = {
	key: PublicKey
	mint: PublicKey
	ata: PublicKey
	data: TradePositionData
}

export type UserLiquidityPosition = {
	key: PublicKey
	mint: PublicKey
	ata: PublicKey
	data: LiquidityPositionData
}