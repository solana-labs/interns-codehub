import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material'
import { deepPurple, pink } from '@mui/material/colors'
import type { Adapter, WalletError } from '@solana/wallet-adapter-base'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletDialogProvider as MaterialUIWalletDialogProvider } from '@solana/wallet-adapter-material-ui'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider as ReactUIWalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  BackpackWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  TorusWalletAdapter,
  TrustWalletAdapter,
  // UnsafeBurnerWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { toast } from 'react-toastify'
import React, { useCallback, useMemo } from 'react'

import { AutoConnectProvider } from '@/components/Context/AutoConnectProvider'
import { useAutoConnect } from '@/hooks/useAutoConnect'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: deepPurple[700],
    },
    secondary: {
      main: pink[700],
    },
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          justifyContent: 'flex-start',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '12px 16px',
        },
        startIcon: {
          marginRight: 8,
        },
        endIcon: {
          marginLeft: 8,
        },
      },
    },
  },
})

function WalletContextProvider({ children }: React.PropsWithChildren) {
  const { autoConnect } = useAutoConnect()

  const network = WalletAdapterNetwork.Devnet

  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  // const endpoint = useMemo(() => "http://localhost:8899");

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new BackpackWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
      // new UnsafeBurnerWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  )

  const onError = useCallback((error: WalletError, adapter?: Adapter) => {
    toast.dismiss()
    toast(error.message ? `${error.name}: ${error.message}` : error.name, { type: 'error' })
    console.error(error, adapter)
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect={autoConnect}>
        <MaterialUIWalletDialogProvider>
          <ReactUIWalletModalProvider>{children}</ReactUIWalletModalProvider>
        </MaterialUIWalletDialogProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default function ContextProvider({ children }: React.PropsWithChildren) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <AutoConnectProvider>
          <WalletContextProvider>{children}</WalletContextProvider>
        </AutoConnectProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  )
}
