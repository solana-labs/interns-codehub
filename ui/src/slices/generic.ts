import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { PublicKey, clusterApiUrl } from '@solana/web3.js'
import { Token } from '@solflare-wallet/utl-sdk'

import type { RootState } from '@/store'
import { tokenUtl } from '@/utils'

// Define a type for the slice state
export interface GenericAppState {
  network: WalletAdapterNetwork | 'localnet'
  // Need to use Helius since the default cluster API doesn't support some operations we need to use
  rpc: string
  globalpoolStaleTimeMs: number,
  // Cached tokens using solfare-wallet/utl-sdk
  tokens: Record<string, Token>, // address => Token
}

// Define the initial state using that type
const initialState: GenericAppState = {
  network: process.env.NEXT_PUBLIC_NODE_ENV === 'production' ? WalletAdapterNetwork.Devnet : 'localnet',
  rpc: process.env.NEXT_PUBLIC_NODE_ENV === 'production' ? clusterApiUrl(WalletAdapterNetwork.Devnet) : 'http://127.0.0.1:8899',
  globalpoolStaleTimeMs: 5000, // 5 seconds (5000ms)
  tokens: {},
}

export const fetchTokens = createAsyncThunk(
  'generic/fetchTokens',
  async ({ mints }: { mints: (string | PublicKey | undefined)[] }, { getState, rejectWithValue }) => {
    const state = getState() as RootState
    if (!state.generic.rpc) return rejectWithValue('Invalid RPC')

    if (!mints.length) return []

    // skip undefined (reject if any) and convert strings to PublicKey in `mints`
    const _mints = mints.filter(m => m).map(m => typeof m === 'string' ? new PublicKey(m) : m) as PublicKey[]
    if (mints.length !== _mints.length) return rejectWithValue('Undefined mint address in array')

    const uncachedMints = _mints.filter(m => !state.generic.tokens[m.toString()])

    if (!uncachedMints.length) return [] // all cached
    return await tokenUtl.fetchMints(uncachedMints)
  }
)

export const genericAppSlice = createSlice({
  name: 'generic',
  initialState,
  reducers: {
    changeNetwork: (state, action: PayloadAction<WalletAdapterNetwork>) => {
      state.network = action.payload
      state.rpc = clusterApiUrl(action.payload)
    },
    setTokens: (state, action: PayloadAction<Record<string, Token>>) => {
      state.tokens = { ...state.tokens, ...action.payload }
    },
    setTokensArray: (state, action: PayloadAction<Token[]>) => {
      action.payload.forEach(token => {
        state.tokens[token.address] = token
      })
    }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchTokens.fulfilled, (state, action) => {
      console.log('fetchTokens.fulfilled')
      action.payload.forEach(token => {
        state.tokens[token.address] = token
      })
    })

    builder.addCase(fetchTokens.rejected, (state, action) => {
      console.log('fetchTokens.rejected')
    })
  },
})

export const { changeNetwork, setTokens, setTokensArray } = genericAppSlice.actions

export const selectNetwork = (state: RootState) => state.generic.network
export const selectTokens = (state: RootState) => state.generic.tokens
export const selectToken = (address: string) => (state: RootState) => state.generic.tokens[address]

export default genericAppSlice.reducer