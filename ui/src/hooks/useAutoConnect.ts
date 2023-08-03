import { useContext } from 'react'

import { AutoConnectContext, AutoConnectContextState } from '@/components/Context/AutoConnectProvider'

export default function useAutoConnect(): AutoConnectContextState {
  return useContext(AutoConnectContext)
}
