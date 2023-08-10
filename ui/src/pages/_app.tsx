import { Box } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import type { AppProps } from 'next/app'
import { Inter } from 'next/font/google'
import { Provider as StoreProvider } from 'react-redux'
import { ToastContainer } from 'react-toastify'
import { PersistGate } from 'redux-persist/integration/react'

import '@solana/wallet-adapter-react-ui/styles.css'
import 'react-toastify/dist/ReactToastify.css'

import '@/styles/global.css'

import WalletContextProvider from '@/components/Context/WalletContextProvider'
import Navbar from "@/components/Navbar";
import { useAppDispatch } from '@/hooks'
import { fetchAllGlobalpools } from '@/slices/globalpool'
import store from '@/store'
import customTheme from '@/theme'

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ['latin'] })

// import { useHydrateStore } from "@/hooks/useHydrateStore";

// const StoreUpdater = () => {
//   useHydrateStore();
//   return null;
// };

function MainLayout({ children }: React.PropsWithChildren) {
  const dispatch = useAppDispatch()
  dispatch(fetchAllGlobalpools())

  return (
    <Box mt={8} py={8} className={inter.className}>
      {children}
    </Box>
  )
}

export default function CladApp({ Component, pageProps }: AppProps) {
  return (
    <StoreProvider store={store}>
      {/* Using redux-persist out-of-box breaks due to invalid de/serialization of BN, Decimal, and PublicKey */}
      {/* <PersistGate loading={null} persistor={persistor}> */}
        <WalletContextProvider>
          <ThemeProvider theme={customTheme}>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              style={{ zIndex: 999999 }}
            />
            <Navbar />
            {/* <StoreUpdater /> */}
            <MainLayout>
              <Component {...pageProps} />
            </MainLayout>
          </ThemeProvider>
        </WalletContextProvider>
      {/* </PersistGate> */}
    </StoreProvider>
  )
}
