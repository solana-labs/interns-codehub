import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { clusterApiUrl } from '@solana/web3.js'

import type { RootState } from '@/store'

// Define a type for the slice state
export interface GenericAppState {
  network: WalletAdapterNetwork | 'localnet'
  // Need to use Helius since the default cluster API doesn't support some operations we need to use
  rpc: string
  globalpoolStaleTimeMs: number,
}

// Define the initial state using that type
const initialState: GenericAppState = {
  network: process.env.NEXT_PUBLIC_NODE_ENV === 'production' ? WalletAdapterNetwork.Devnet : 'localnet',
  rpc: process.env.NEXT_PUBLIC_NODE_ENV === 'production' ? clusterApiUrl(WalletAdapterNetwork.Devnet) : 'http://127.0.0.1:8899',
  globalpoolStaleTimeMs: 5000, // 5 seconds (5000ms)
}

export const genericAppSlice = createSlice({
  name: 'generic',
  initialState,
  reducers: {
    changeNetwork: (state, action: PayloadAction<WalletAdapterNetwork>) => {
      state.network = action.payload
      state.rpc = clusterApiUrl(action.payload)
    },
  },
})

export const { changeNetwork } = genericAppSlice.actions

// Other code such as selectors can use the imported `RootState` type
export const selectNetwork = (state: RootState) => state.generic.network

export default genericAppSlice.reducer