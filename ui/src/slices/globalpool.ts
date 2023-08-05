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

export const fetchAllGlobalpools = createAsyncThunk<
Record<string, ExpirableGlobalpoolData>
>(
  'globalpool/fetchAll',
  async ({ getState, rejectWithValue }) => {
    const state = getState() as RootState
    if (!state.generic.rpc) return rejectWithValue('Invalid RPC')

    
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

export const selectGlobalpool = (key: PublicKey | string | undefined) => (state: RootState) => {
  if (!key) return undefined
  const _key = key instanceof PublicKey ? key.toBase58() : key
  return state.globalpool.globalpools[_key]
}

export const selectGlobalpoolByMints = (mintA: PublicKey | string | undefined, mintB: PublicKey | string | undefined, feeTier?: number) => (state: RootState) => {
  console.log(state.globalpool)
  if (!mintA || !mintB) return undefined
  if (!state.globalpool.globalpools) return undefined

  const _mintA = typeof mintA === 'string' ? new PublicKey(mintA) : mintA
  const _mintB = typeof mintB === 'string' ? new PublicKey(mintB) : mintB

  const list = Object.values(state.globalpool.globalpools).filter((pool) => pool.tokenMintA.equals(_mintA) && pool.tokenMintB.equals(_mintB))
  
  if (feeTier) return list.find((pool) => pool.feeRate === feeTier) || undefined
  return list[0] || undefined
}

export default globalpoolSlice.reducer