import { useLocalStorage } from '@solana/wallet-adapter-react'
import React, { createContext } from 'react'

export interface AutoConnectContextState {
  autoConnect: boolean
  setAutoConnect(autoConnect: boolean): void
}

export const AutoConnectContext = createContext<AutoConnectContextState>({} as AutoConnectContextState)

export function AutoConnectProvider({ children }: React.PropsWithChildren) {
  const [autoConnect, setAutoConnect] = useLocalStorage('autoConnect', true)
  return <AutoConnectContext.Provider value={{ autoConnect, setAutoConnect }}>{children}</AutoConnectContext.Provider>
}
