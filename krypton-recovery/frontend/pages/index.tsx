import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import CreateAccount from "../components/CreateAccount";
import RestoreAccount from "../components/RestoreAccount";
import styled from "styled-components";
import LoginAccount from "../components/LoginAccount";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta charSet="utf-8" />
        <title>Krypton</title>
        <meta name="description" content="Next-gen smart contract wallet" />
        <link rel="icon" href="/krypton_logo.ico" />
      </Head>
      <HomeTitle>
      a <a href="https://solana.com/">Solana</a> smart contract wallet with multisig social recovery
      </HomeTitle>

      <HomeGrid>
        <CreateAccount />
        <LoginAccount />
        <RestoreAccount />
      </HomeGrid>
    </>
  );
};

const HomeTitle = styled.h1`
  padding: 0 3rem;
  margin: 3rem 1rem;
  line-height: 1.25;
  font-size: 1.5rem;
  font-weight: normal;
  text-align: center;

  & > a {
    color: #0070f3;
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
`;

export default Home;
