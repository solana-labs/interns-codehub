import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { Connection, PublicKey } from '@solana/web3.js'

import getGlobalpool from '@/lib/getGlobalpool'
import type { RootState } from '@/store'
import { GlobalpoolData } from '@/types/accounts'

export type ExpirableGlobalpoolData = GlobalpoolData & { _lastFetchTimestamp: number }

// Define a type for the slice state
export interface GlobalpoolState {
  globalpools: Record<string, ExpirableGlobalpoolData>
}

// Define the initial state using that type
const initialState: GlobalpoolState = {
  globalpools: {},
}

export const fetchGlobalpool = createAsyncThunk<
  ExpirableGlobalpoolData & { _address: string }, // Return type of the payload creator
  PublicKey // First argument to the payload creator
>(
  'globalpool/fetch',
  async (globalpoolKey: PublicKey, { getState, rejectWithValue }) => {
    const state = getState() as RootState
    if (!state.generic.rpc) return rejectWithValue('Invalid RPC')

    const globalpoolKeyStr = globalpoolKey.toBase58()

    // If globalpool is cached and not stale (<= `globalpoolStaleTimeMs` old, then use the cached data)
    const cachedPool = state.globalpool.globalpools[globalpoolKeyStr]
    if (cachedPool) {
      const lastFetchDiff = Date.now() - cachedPool._lastFetchTimestamp
      const needToFetch = lastFetchDiff > state.generic.globalpoolStaleTimeMs
      if (!needToFetch) return { ...cachedPool, _address: globalpoolKeyStr }
    }

    const poolData = await getGlobalpool(globalpoolKey, new Connection(state.generic.rpc))
    if (!poolData) return rejectWithValue('Invalid globalpool address')
    return { ...poolData, _lastFetchTimestamp: Date.now(), _address: globalpoolKeyStr }
  }
)

export const globalpoolSlice = createSlice({
  name: 'globalpool',
  initialState,
  reducers: {
    // increment: (state) => {
    //   state.value += 1
    // },
    // decrement: (state) => {
    //   state.value -= 1
    // },
    // // Use the PayloadAction type to declare the contents of `action.payload`
    // incrementByAmount: (state, action: PayloadAction<number>) => {
    //   state.value += action.payload
    // },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchGlobalpool.fulfilled, (state, action) => {
      // both `state` and `action` are now correctly typed
      // based on the slice state and the `pending` action creator
      state.globalpools[action.payload._address] = action.payload as ExpirableGlobalpoolData
    })
  },
})

// export const { increment, decrement, incrementByAmount } = globalpoolSlice.actions

// Other code such as selectors can use the imported `RootState` type
export const selectGlobalpools = (state: RootState) => state.globalpool.globalpools

export const selectGlobalpool = (key: PublicKey | string) => (state: RootState) => state.globalpool.globalpools[(key instanceof PublicKey) ? key.toBase58() : key]

export default globalpoolSlice.reducer