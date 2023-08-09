import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { Connection, PublicKey } from '@solana/web3.js'

import { GLOBALPOOL_STRUCT_SIZE } from '@/constants'
import getGlobalpool from '@/lib/getGlobalpool'
import type { RootState } from '@/store'
import { GlobalpoolData } from '@/types/accounts'
import { CLAD_PROGRAM_ID } from '@/constants'
import getAccountData from '@/lib/getAccountData'
import { ParsableGlobalpool } from '@/types/parsing'

export type ExpirableGlobalpoolData = GlobalpoolData & { _lastFetchTimestamp: number, _pubkey: string }

// Define a type for the slice state
export interface GlobalpoolState {
  globalpools: Record<string, ExpirableGlobalpoolData>
}

// Define the initial state using that type
const initialState: GlobalpoolState = {
  globalpools: {},
}

export const fetchGlobalpool = createAsyncThunk<
  ExpirableGlobalpoolData, // Return type of the payload creator
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
      if (!needToFetch) return { ...cachedPool, _pubkey: globalpoolKeyStr }
    }

    const poolData = await getGlobalpool(globalpoolKey, new Connection(state.generic.rpc))
    if (!poolData) return rejectWithValue('Invalid globalpool address')
    return { ...poolData, _lastFetchTimestamp: Date.now(), _pubkey: globalpoolKeyStr }
  }
)

export const fetchAllGlobalpools = createAsyncThunk<
  Record<string, ExpirableGlobalpoolData>
>(
  'globalpool/fetchAll',
  async (arg: any, { getState, rejectWithValue }) => {
    const state = getState() as RootState
    if (!state.generic.rpc) return rejectWithValue('Invalid RPC')

    const connection = new Connection(state.generic.rpc)

    // Candidate Globalpool PDAs
    const globalpoolCandidates = await connection.getParsedProgramAccounts(
      CLAD_PROGRAM_ID,
      {
        filters: [
          {
            dataSize: GLOBALPOOL_STRUCT_SIZE
          },
        ],
      }
    )

    const globalpools: Record<string, ExpirableGlobalpoolData> = {}
    const _lastFetchTimestamp = Date.now()
    for (const globalpoolCandidate of globalpoolCandidates) {
      const globalpool = await getAccountData(globalpoolCandidate.pubkey, ParsableGlobalpool, connection)
      if (!globalpool) continue
      const _pubkey = globalpoolCandidate.pubkey.toBase58()
      globalpools[_pubkey] = { ...globalpool, _lastFetchTimestamp, _pubkey }
    }

    console.log('dispatch fetchAllGlobalpools', globalpools)
    return globalpools
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
      state.globalpools[action.payload._pubkey] = action.payload as ExpirableGlobalpoolData
    })

    builder.addCase(fetchAllGlobalpools.fulfilled, (state, action) => {
      console.log('fetchAllGlobalpools.fulfilled', action.payload)
      state.globalpools = action.payload
    })

    builder.addCase(fetchAllGlobalpools.pending, (state, action) => {
      console.log('fetchAllGlobalpools.pending')
    })

    builder.addCase(fetchAllGlobalpools.rejected, (state, action) => {
      console.log('fetchAllGlobalpools.rejected')
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
  // console.log('selectGlobalpoolByMints', state.globalpool)
  if (!mintA || !mintB) return undefined
  if (!state.globalpool.globalpools) return undefined

  const _mintA = typeof mintA === 'string' ? new PublicKey(mintA) : mintA
  const _mintB = typeof mintB === 'string' ? new PublicKey(mintB) : mintB

  const list = Object.values(state.globalpool.globalpools).filter((pool) => pool.tokenMintA.equals(_mintA) && pool.tokenMintB.equals(_mintB))

  const globalpool = feeTier ? list.find((pool) => pool.feeRate === feeTier) : list[0]
  return globalpool ?? undefined
}

export default globalpoolSlice.reducer