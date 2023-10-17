import { Badge, Dropdown, Menu, Divider } from "antd";
import React, { BaseSyntheticEvent, ReactElement } from "react";
import {
  DownOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  LogoutOutlined,
  CreditCardOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import styles from "./index.module.css";
import { useGlobalState } from "../../context";
import { useRouter } from "next/router";
import { Cluster } from "@solana/web3.js";

type DomEvent = {
  domEvent: BaseSyntheticEvent;
  key: string;
  keyPath: Array<string>;
};

const Layout = ({ children }: { children: JSX.Element }): ReactElement => {
  const { network, setNetwork, account, setAccount, setBalance, setMnemonic } =
    useGlobalState();

  const router = useRouter();

  const selectNetwork = (e: DomEvent) => {
    const networks: Array<Cluster> = ["mainnet-beta", "devnet", "testnet"];
    const selectedNetwork = networks[parseInt(e.key) - 1];
    setNetwork(selectedNetwork);
  };

  const menu = (
    <Menu>
      <Menu.Item onClick={selectNetwork} key="1">
        Mainnet {network === "mainnet-beta" && <Badge status="processing" />}
      </Menu.Item>
      <Menu.Item onClick={selectNetwork} key="2">
        Devnet {network === "devnet" && <Badge status="processing" />}
      </Menu.Item>
      <Menu.Item onClick={selectNetwork} key="3">
        Testnet {network === "testnet" && <Badge status="processing" />}
      </Menu.Item>
    </Menu>
  );

  const handleLogout = () => {
    setAccount(null);
    setNetwork("devnet");
    setBalance(0);
    setMnemonic("");
    router.push("/");
  };

  const profile = (
    <Menu>
      <Menu.Item key="/guardian" icon={<TeamOutlined />}>
        <Link href="/guardian" passHref>
          Guardian
        </Link>
      </Menu.Item>
      <Menu.Item key="/wallet" icon={<CreditCardOutlined />}>
        <Link href="/wallet" passHref>
          Wallet
        </Link>
      </Menu.Item>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={styles.container}>
      <main className={styles.main}>
      <link rel="icon" href="/krypton_logo.ico" />
        <header className={styles.header}>
          <title>Krypton</title>
          <Link href={`/`} passHref>
            <div className={`${styles.top} ${styles.logo}`}>Krypton</div>
          </Link>
          

          <Menu
            mode="horizontal"
            className={styles.nav}
            selectedKeys={[router.pathname]}
          >
            <Dropdown className={styles.top} overlay={menu} disabled={!account}>
              <a
                className="ant-dropdown-link"
                onClick={(e) => e.preventDefault()}
              >
                Network <DownOutlined />
              </a>
            </Dropdown>

            {account && (
              <Dropdown
                className={styles.top}
                overlay={profile}
                disabled={!account}
              >
                <a
                  className="ant-dropdown-link"
                  onClick={(e) => e.preventDefault()}
                >
                  <UserOutlined />
                </a>
              </Dropdown>
            )}
          </Menu>
        </header>

        {children}

        {router.pathname !== "/" && (
          <Link href="/" passHref>
            <a className={styles.back}>
              <ArrowLeftOutlined /> Back Home
            </a>
          </Link>
        )}

        <Divider style={{ marginTop: "3rem" }} />

        {/* <footer className={styles.footerHome}>
          <p>
            MyWallet tutorial created by{" "}
            <a className={styles.footerLink} href="https://learn.figment.io/">
              Figment Learn
            </a>
          </p>
        </footer> */}
      </main>
    </div>
  );
};

export default Layout;
