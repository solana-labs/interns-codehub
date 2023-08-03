import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { Connection } from '@solana/web3.js'
import { useMemo } from 'react'

import { CLAD_IDL, CLAD_PROGRAM_ID } from '@/constants'
import { Clad } from '@/target/types/clad'

export default function useCladProgram(connection?: Connection) {
	const wallet = useAnchorWallet()
	return useMemo(() => {
		if (!connection || !wallet) return undefined

		const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
		// CLAD_IDL.version = '0.1.0' as const
		// @ts-ignore for: Types of property '"version"' are incompatible. Type 'string' is not assignable to type '"0.1.0"')
		return new Program<Clad>(CLAD_IDL, CLAD_PROGRAM_ID, provider)
	}, [connection, wallet])
}