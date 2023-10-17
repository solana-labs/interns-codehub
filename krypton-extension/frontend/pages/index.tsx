import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import CreateAccount from "../components/CreateAccount";
import styled from "styled-components";
import { useRouter } from "next/router";
import { useGlobalState } from "../context";
import { getAccountFromPkString } from "../utils";
import { useGlobalModalContext } from "../components/GlobalModal";

const Home: NextPage = () => {
  const router = useRouter();
  const { setAccount, setNetwork } = useGlobalState();
  const [visible, setVisible] = useState<boolean>(false);

  const modalContext = useGlobalModalContext();

  useEffect(() => {
    chrome.storage.local.get(["pk", "mode", "network"]).then(async (result) => {
      if (result.pk == undefined) {
        chrome.storage.local.set({
          counter: 1,
          currId: 1,
          accounts: "{}",
          y_counter: 1,
          y_id: 1,
          y_accounts: "{}",
          mode: 0,
          network: "devnet"
        });
        setVisible(true);
        return;
      }

      // TODO: Detoxify this
      const currKeypair = await getAccountFromPkString(result.pk, modalContext);
      if (!currKeypair) {
        return;
      }
      console.log(currKeypair);
      setAccount(currKeypair);
      setNetwork(result.network);
      router.push("/wallet");
    });
  }, [modalContext, router, setAccount]);

  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta charSet="utf-8" />
        <title>Krypton</title>
        <meta
          name="description"
          content="Next-gen social recovery non-custodial wallet."
        />
        <link rel="icon" href="/static/icons/krypton_logo.ico" />
      </Head>
      {!visible && (
        <div style={{ minWidth: "600px", minHeight: "500px" }}></div>
      )}
      {visible && (
        <>
          <HomeTitle>
            a{" "}
            <a href="https://solana.com/" className="gradient-text">
              Solana
            </a>{" "}
            smart contract wallet with multisig social recovery
          </HomeTitle>
          <HomeGrid>
            <CreateAccount />
          </HomeGrid>
        </>
      )}
    </>
  );
};

const HomeTitle = styled.h1`
  padding: 0 3rem;
  margin: 1.7rem 1rem;
  line-height: 1.25;
  font-size: 1.7rem;
  font-weight: normal;
  text-align: center;
  color: #fff;
  & > a {
    color: #fff;
    text-decoration: none;

    &:hover,
    &:focus,
    &:active {
      text-decoration: underline;
    }
  }
`;

const HomeGrid = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 2000px;
  width: 100%;
  height: 100%;
`;

export default Home;
