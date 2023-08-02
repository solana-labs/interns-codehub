import { configureStore } from '@reduxjs/toolkit'

import { genericAppReducer, liquidityPositionReducer, tradePositionReducer } from '@/slices'

const store = configureStore({
	reducer: {
		generic: genericAppReducer,
		liquidityPosition: liquidityPositionReducer,
		tradePosition: tradePositionReducer,
	},
	devTools: true,
})

export default store;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: { ...reducers }
export type AppDispatch = typeof store.dispatch