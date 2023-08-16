import { Program } from '@coral-xyz/anchor'
import { AnchorWallet } from '@solana/wallet-adapter-react'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { CLAD_PROGRAM_ID } from '@/constants'
import { Clad } from '@/target/types/clad'
import { GlobalpoolData } from '@/types/accounts'
import { UserLiquidityPosition } from '@/types/user'
import { getTickArrayKeyFromTickIndex } from '@/utils'

export type CloseLiquidityPositionParams = {
	position: UserLiquidityPosition
	positionAuthority: PublicKey
	globalpoolKey: PublicKey
	globalpool: GlobalpoolData
	program: Program<Clad>
	wallet: AnchorWallet
}

export async function closeLiquidityPosition(params: CloseLiquidityPositionParams) {
	const {
		position,
		positionAuthority,
		globalpoolKey,
		globalpool,
		program,
	} = params

	const {
		tickSpacing,
		tokenVaultA,
		tokenVaultB,
		tokenMintA: tokenMintAKey,
		tokenMintB: tokenMintBKey,
	} = globalpool

	const {
		mint: positionMintPubkey,
		ata: positionTokenAccount,
		key: positionKey,
		data: liquidityPositionData,
	} = position

	const {
		tickLowerIndex,
		tickUpperIndex,
		liquidity: liquidityAmount,
	} = liquidityPositionData

	//
	// Clsoe Liquidity Position
	//

	const closeLiquidityPositionAccounts = {
		positionAuthority: positionAuthority,
		receiver: positionAuthority,

		position: positionKey,
		positionMint: positionMintPubkey,
		positionTokenAccount,

		// sys
		tokenProgram: TOKEN_PROGRAM_ID,
	}

	const decreaseLiquidityPositionParams = {
		liquidityAmount,
		tokenMinA: new BN(0),
		tokenMinB: new BN(0),
	}

	const tickArrayLowerKey = getTickArrayKeyFromTickIndex(
		globalpoolKey,
		tickLowerIndex,
		tickSpacing,
		CLAD_PROGRAM_ID
	)

	const tickArrayUpperKey = getTickArrayKeyFromTickIndex(
		globalpoolKey,
		tickUpperIndex,
		tickSpacing,
		CLAD_PROGRAM_ID
	)

	const tokenOwnerAccountA = getAssociatedTokenAddressSync(
		tokenMintAKey,
		positionAuthority,
		true
	)

	const tokenOwnerAccountB = getAssociatedTokenAddressSync(
		tokenMintBKey,
		positionAuthority,
		true
	)

	const decreaseLiquidityPositionAccounts = {
		positionAuthority,
		globalpool: globalpoolKey,
		position: positionKey,
		positionTokenAccount,
		tokenOwnerAccountA,
		tokenOwnerAccountB,
		tokenVaultA,
		tokenVaultB,
		tickArrayLower: tickArrayLowerKey,
		tickArrayUpper: tickArrayUpperKey,
		// sys
		tokenProgram: TOKEN_PROGRAM_ID,
	}

	const collectFeesAccounts = decreaseLiquidityPositionAccounts

	await program.methods
		.collectFees()
		.accounts(collectFeesAccounts)
		.rpc()

	await program.methods
		.decreaseLiquidity(decreaseLiquidityPositionParams)
		.accounts(decreaseLiquidityPositionAccounts)
		.rpc()

	await program.methods
		.closeLiquidityPosition()
		.accounts(closeLiquidityPositionAccounts)
		.rpc()

	console.log('Position closed!')
}
