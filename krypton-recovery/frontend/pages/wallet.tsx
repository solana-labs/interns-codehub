import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Tooltip, Drawer, Typography } from "antd";
import { useGlobalState } from "../context";
import { useRouter } from "next/router";
import TransactionLayout from "../components/TransactionLayout";
import { refreshBalance, handleAirdrop } from "../utils";
import { ArrowRightOutlined, LoadingOutlined } from "@ant-design/icons";
import {
  Dashboard,
  Airdrop,
  Question,
} from "../styles/StyledComponents.styles";

const { Paragraph } = Typography;

const Wallet: NextPage = () => {
  const { network, account, balance, setBalance } = useGlobalState();
  const [visible, setVisible] = useState<boolean>(false);
  const [airdropLoading, setAirdropLoading] = useState<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    if (!account) {
      router.push("/");
      return;
    }
    refreshBalance(network, account)
      .then((updatedBalance) => {
        setBalance(updatedBalance);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [account, router, network]);

  const airdrop = async () => {
    setAirdropLoading(true);
    const updatedBalance = await handleAirdrop(network ?? "devnet", account);
    if (typeof updatedBalance === "number") {
      setBalance(updatedBalance);
    }
    setAirdropLoading(false);
  };

  const showModal = () => {
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
  };

  const displayAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <>
      {account && (
        <Dashboard>
          <h1>Dashboard</h1>

          <Paragraph
            copyable={{ text: account.publicKey.toString(), tooltips: `Copy` }}
          >
            {`Account: ${displayAddress(account.publicKey.toString())}`}
          </Paragraph>

          <p>
            Connected to{" "}
            {network &&
              (network === "mainnet-beta"
                ? network.charAt(0).toUpperCase() + network.slice(1, 7)
                : network.charAt(0).toUpperCase() + network.slice(1))}
          </p>
          {airdropLoading ? (
            <h2>
              <LoadingOutlined spin />
            </h2>
          ) : (
            <h2>
              {balance} <span>SOL</span>
            </h2>
          )}

          {network === "devnet" && account && (
            <>
              <Airdrop onClick={airdrop}>Airdrop</Airdrop>
              <Tooltip
                title="Click to receive 1 devnet SOL into your account"
                placement={"right"}
              >
                <Question>?</Question>
              </Tooltip>
            </>
          )}

          {/* <Button type="primary" onClick={showModal}>
            Send <ArrowRightOutlined />
          </Button>

          <Drawer
            title="Send Funds"
            placement="bottom"
            onClose={handleClose}
            visible={visible}
            height={"55vh"}
          >
            <TransactionLayout />
          </Drawer> */}
        </Dashboard>
      )}
    </>
  );
};

export default Wallet;
