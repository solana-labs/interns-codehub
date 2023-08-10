import { useContext } from 'react'

import { AutoConnectContext, AutoConnectContextState } from '@/components/Context/AutoConnectProvider'

export function useAutoConnect(): AutoConnectContextState {
  return useContext(AutoConnectContext)
}
