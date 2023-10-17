import React, { useState } from "react";
import { Cluster, Keypair, PublicKey } from "@solana/web3.js";
import "antd/dist/antd.css";
import type { AppProps } from "next/app";
import { GlobalContext } from "../context";
import Layout from "../components/Layout";
import Head from "next/head";

function MyApp({ Component, pageProps }: AppProps) {
  const [network, setNetwork] = useState<Cluster | undefined>("devnet");
  const [account, setAccount] = useState<Keypair | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [guardians, setGuardians] = useState<Array<PublicKey>>([]);
  const [pda, setPDA] = useState<PublicKey | null>(null);
  const [programId, setProgramId] = useState<PublicKey | null>(null);
  const [recoverPk, setRecoverPk] = useState<PublicKey | null>(null);
  const [finished, setFinished] = useState<boolean>(false);

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
        pda,
        setPDA,
        programId,
        setProgramId,
        recoverPk,
        setRecoverPk,
        finished,
        setFinished,
      }}
    >
      <Layout>
        <>
          <Head>
            <meta
              name="viewport"
              content="initial-scale=1.0, width=device-width"
            />
            <meta charSet="utf-8" />
            <title>Krypton</title>
            <meta name="description" content="Next-gen smart contract wallet" />
            <link rel="icon" href="/krypton_logo.ico" />
          </Head>
          <Component {...pageProps} />
        </>
      </Layout>
    </GlobalContext.Provider>
  );
}
export default MyApp;
