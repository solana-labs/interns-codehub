import React from "react";
import { NextPage } from "next";
import { List } from "antd";
import {
  WalletOutlined,
  NodeCollapseOutlined,
  KeyOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/router";
import styles from "../../components/Layout/index.module.css";
import Link from "next/link";

const Onboard: NextPage = () => {
  const router = useRouter();

  return (
    <>
      <h1 className={"title"}>Add a new account</h1>
      <div className={"tokenlist"} style={{ margin: "13px 0" }}>
        <List style={{ margin: "10px 0" }}>
          <List.Item
            key="standard"
            onClick={() => {
              router.push("/signup");
            }}
            style={{ marginBottom: "20px" }}
          >
            <List.Item.Meta
              avatar={
                <WalletOutlined style={{ fontSize: "25px", color: "#fff" }} />
              }
              title="Standard Account"
              description={"Create a Krypton wallet"}
            />
          </List.Item>

          <List.Item
            key="yubikey"
            onClick={() => {
              router.push("/accounts/yubikey/onboard");
            }}
            style={{ marginBottom: "20px" }}
          >
            <List.Item.Meta
              avatar={
                <KeyOutlined style={{ fontSize: "25px", color: "#fff" }} />
              }
              title="Yubikey"
              description={"Connect to your Yubikey wallet"}
            />
          </List.Item>

          <List.Item key="ledger">
            <List.Item.Meta
              avatar={
                <NodeCollapseOutlined
                  style={{ fontSize: "25px", color: "#fff" }}
                />
              }
              title="Ledger Account"
              description={"Connect to your Ledger Wallet"}
            />
          </List.Item>
        </List>
      </div>

      <Link href="/accounts" passHref>
        <a
          className={styles.back}
          style={{ position: "absolute", bottom: "60px", fontSize: "17px" }}
        >
          <ArrowLeftOutlined /> Back
        </a>
      </Link>
    </>
  );
};

export default Onboard;
