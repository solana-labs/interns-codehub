import { Box } from '@mui/material'
import type { AppProps } from 'next/app'
import { Inter } from 'next/font/google'
import { Provider as StoreProvider } from 'react-redux'
import { ToastContainer } from 'react-toastify'

import '@solana/wallet-adapter-react-ui/styles.css'
import 'react-toastify/dist/ReactToastify.css'

import '@/styles/global.css'

import WalletContextProvider from '@/components/Context/WalletContextProvider'
import Navbar from "@/components/Navbar";
import store from '@/store'

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ['latin'] })

// import { useHydrateStore } from "@/hooks/useHydrateStore";

// const StoreUpdater = () => {
//   useHydrateStore();
//   return null;
// };

function MainLayout({ children }: React.PropsWithChildren) {
  return (
    <Box mt={8} py={3} className={inter.className}>
      {children}
    </Box>
  )
}

export default function CladApp({ Component, pageProps }: AppProps) {
  return (
    <StoreProvider store={store}>
      <WalletContextProvider>
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
        />
        <Navbar />
        {/* <StoreUpdater /> */}
        <MainLayout>
          <Component {...pageProps} />
        </MainLayout>
      </WalletContextProvider>
    </StoreProvider>
  )
}
