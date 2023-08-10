import { configureStore, combineReducers, createSerializableStateInvariantMiddleware } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/dist/query'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import thunk from 'redux-thunk'

import { genericAppReducer, globalpoolReducer, liquidityPositionReducer, tradePositionReducer } from '@/slices'

// const serializableMiddleware = createSerializableStateInvariantMiddleware({
//   ignoredActions: ['globalpool/fetchAll'],
// })

// Strongly recommended to blacklist any api(s) that you have configured with RTK Query.
// If the api slice reducer is not blacklisted, the api cache will be automatically persisted and
// restored which could leave you with phantom subscriptions from components that do not exist any more.
// const persistConfig = {
//   key: 'root',
//   version: 1,
//   storage,
//   blacklist: [],
// }

const reducers = combineReducers({
  generic: genericAppReducer,
  globalpool: globalpoolReducer,
  liquidityPosition: liquidityPositionReducer,
  tradePosition: tradePositionReducer,
})

// const persistedReducer = persistReducer(persistConfig, reducers)

const store = configureStore({
  reducer: reducers,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware({
      // serializableCheck: {
      //   ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      // },
    })
      .concat(thunk)
      // .concat(serializableMiddleware)
  },
})

setupListeners(store.dispatch)

export default store

// export const persistor = persistStore(store)

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: { ...reducers }
export type AppDispatch = typeof store.dispatch