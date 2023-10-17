import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { Form, Input, Button } from "antd";
import { useGlobalState } from "../../context";
import { LoadingOutlined } from "@ant-design/icons";
import styled from "styled-components";

import { Keypair } from "@solana/web3.js";
import { SignTransaction } from "../../components/signTransaction";
import { WalletMultiButton } from "@solana/wallet-adapter-ant-design";
import WalletContextProvider from "../../components/WalletContextProvider";

// Import the Keypair class from Solana's web3.js library:

const Recover: NextPage = () => {
  const router = useRouter();
  const { pk } = router.query;

  const { account, finished } = useGlobalState();

  useEffect(() => {
    if (account) {
      router.push("/wallet");
    }
  }, [account, router]);

  return (
    <>
      <h1 className={"title"}>Recover your Kryptonian</h1>

      {!finished && (
        <p>
          Sign a recovery transaction to help your Kryptonian <br></br> {pk}
        </p>
      )}

      <WalletContextProvider>
        {!finished && <WalletMultiButton className="px-10 py-10" />}
        {!finished && <br />}
        <SignTransaction pk={pk} />
      </WalletContextProvider>
    </>
  );
};

export default Recover;
