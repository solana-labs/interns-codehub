import React, { useState } from "react";
import { Cluster, Keypair, PublicKey } from "@solana/web3.js";
import "antd/dist/antd.css";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { GlobalContext } from "../context";
import Layout from "../components/Layout";
import { PgpCardInfo } from "bloss-js";
import { GlobalModal } from "../components/GlobalModal";
import { KryptonAccount } from "../types/account";

function MyApp({ Component, pageProps }: AppProps) {
  const [network, setNetwork] = useState<Cluster | undefined>("devnet");
  const [account, setAccount] = useState<KryptonAccount>();
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [guardians, setGuardians] = useState<Array<PublicKey>>([]);
  const [recoverPk, setRecoverPk] = useState<PublicKey | null>(null);
  const [tokens, setTokens] = useState<Array<[PublicKey, bigint, number]>>([]);
  const [currId, setCurrId] = useState<number | null>(1);
  const [yubikeyInfo, setYubikeyInfo] = useState<PgpCardInfo | null>(null);

  return (
    <GlobalContext.Provider
      value={{
        network,
        setNetwork,
        account,
        setAccount,
        mnemonic,
        setMnemonic,
        balance,
        setBalance,
        guardians,
        setGuardians,
        recoverPk,
        setRecoverPk,
        tokens,
        setTokens,
        currId,
        setCurrId,
        yubikeyInfo,
        setYubikeyInfo,
      }}
    >
      <GlobalModal>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </GlobalModal>
    </GlobalContext.Provider>
  );
}
export default MyApp;
