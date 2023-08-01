import type { AppProps } from 'next/app'
import { Inter } from 'next/font/google'
import { ToastContainer } from 'react-toastify'

import '@solana/wallet-adapter-react-ui/styles.css'
import 'react-toastify/dist/ReactToastify.css'

import '@/styles/global.css'

import WalletContextProvider from '@/components/Context/WalletContextProvider'

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ['latin'] })

// import { Navbar } from "@/components/Navbar";
// import { useHydrateStore } from "@/hooks/useHydrateStore";

// const StoreUpdater = () => {
//   useHydrateStore();
//   return null;
// };

export default function CladApp({ Component, pageProps }: AppProps) {
  return (
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
      {/* <Navbar /> */}
      {/* <StoreUpdater /> */}
      <main className={inter.className}>
        <Component {...pageProps} />
      </main>
    </WalletContextProvider>
  )
}
