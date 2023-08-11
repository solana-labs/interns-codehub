import { configureStore, combineReducers, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/dist/query'
import thunk from 'redux-thunk'

import { genericAppReducer, globalpoolReducer, liquidityPositionReducer, tradePositionReducer } from '@/slices'
import { fetchGlobalpool, fetchAllGlobalpools, ExpirableGlobalpoolData } from '@/slices/globalpool'
import { fetchTokens } from './slices/generic'

const reducers = combineReducers({
  generic: genericAppReducer,
  globalpool: globalpoolReducer,
  liquidityPosition: liquidityPositionReducer,
  tradePosition: tradePositionReducer,
})

const listenerMiddleware = createListenerMiddleware()

//
// Fetch any token addresses in globalpools (if not cached)
//
listenerMiddleware.startListening({
  matcher: isAnyOf(fetchAllGlobalpools.fulfilled, fetchGlobalpool.fulfilled),
  effect: async (action, listenerApi) => {
    // Can cancel other running this instance
    listenerApi.cancelActiveListeners()

    // Collect all to-fetch mint addresses
    const mints = new Set<string>()
    Object.values(action.payload as Record<string, ExpirableGlobalpoolData>).forEach((globalpool) => {
      mints.add(globalpool.tokenMintA.toString())
      mints.add(globalpool.tokenMintB.toString())
    })

    // Use the listener API methods to dispatch state updates
    listenerApi.dispatch(fetchTokens({ mints: Array.from(mints) }))
  }
})


const store = configureStore({
  reducer: reducers,
  devTools: process.env.NODE_ENV !== 'production',
  // Prepend the `listenerMiddleware` before the serializable check middleware since
  // it can receive actions with functions inside.
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)
      .concat(thunk)
  },
})

setupListeners(store.dispatch)

export default store

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: { ...reducers }
export type AppDispatch = typeof store.dispatch