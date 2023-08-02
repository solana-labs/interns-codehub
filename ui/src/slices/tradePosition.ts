import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { Connection, PublicKey } from '@solana/web3.js'

import { CLAD_PROGRAM_ID } from '@/constants'
import { getUserTradePositions } from '@/lib/getPositions'
import type { RootState } from '@/store'
import { UserTradePosition } from '@/types/user'

// Define a type for the slice state
export interface TradePositionState {
	positions: UserTradePosition[]
}

// Define the initial state using that type
const initialState: TradePositionState = {
	positions: [],
}

export const fetchTradePositionsByUser = createAsyncThunk<
	UserTradePosition[], // Return type of the payload creator
	PublicKey // First argument to the payload creator
>(
	"tradePosition/fetchByUser",
	async (user: PublicKey, { getState }) => {
		const state = getState() as RootState

		if (!state.generic.rpc) return []

		return getUserTradePositions(user, new Connection(state.generic.rpc), CLAD_PROGRAM_ID);
	}
);

export const tradePositionSlice = createSlice({
	name: 'tradePosition',
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
		builder.addCase(fetchTradePositionsByUser.fulfilled, (state, action) => {
			// both `state` and `action` are now correctly typed
			// based on the slice state and the `pending` action creator
			state.positions = action.payload
		})
	},
})

// export const { increment, decrement, incrementByAmount } = tradePositionSlice.actions

// Other code such as selectors can use the imported `RootState` type
export const selectTradePositions = (state: RootState) => state.tradePosition.positions

export default tradePositionSlice.reducer