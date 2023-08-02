import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { Connection, PublicKey } from '@solana/web3.js'

import { CLAD_PROGRAM_ID } from '@/constants'
import { getUserLiquidityPositions } from '@/lib/getPositions'
import type { RootState } from '@/store'
import { UserLiquidityPosition } from '@/types/user'

// Define a type for the slice state
export interface LiquidityPositionState {
  positions: UserLiquidityPosition[]
}

// Define the initial state using that type
const initialState: LiquidityPositionState = {
  positions: [],
}

export const fetchLiquidityPositionsByUser = createAsyncThunk<
  UserLiquidityPosition[], // Return type of the payload creator
  PublicKey // First argument to the payload creator
>(
  "liquidityPosition/fetchByUser",
  async (user: PublicKey, { getState }) => {
    const state = getState() as RootState

    if (!state.generic.rpc) return []

    return getUserLiquidityPositions(user, new Connection(state.generic.rpc), CLAD_PROGRAM_ID);
  }
);

export const liquidityPositionSlice = createSlice({
  name: 'liquidityPosition',
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
    builder.addCase(fetchLiquidityPositionsByUser.fulfilled, (state, action) => {
      // both `state` and `action` are now correctly typed
      // based on the slice state and the `pending` action creator
      state.positions = action.payload
    })
  },
})

// export const { increment, decrement, incrementByAmount } = liquidityPositionSlice.actions

// Other code such as selectors can use the imported `RootState` type
export const selectLiquidityPositions = (state: RootState) => state.liquidityPosition.positions

export default liquidityPositionSlice.reducer