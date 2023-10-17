import { Badge, Dropdown, Menu, Button, Avatar, MenuProps } from "antd";
import React, { BaseSyntheticEvent, useEffect, useState } from "react";
import {
  DownOutlined,
  WalletOutlined,
  TeamOutlined,
  AppstoreOutlined,
  SwapOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import styles from "./index.module.css";
import { useGlobalState } from "../../context";
import { useRouter } from "next/router";
import { Cluster, Connection, PublicKey } from "@solana/web3.js";
import { getAvatar } from "../../utils/avatar";
import { getCurrentAccount } from "../../utils";
import { useGlobalModalContext } from "../GlobalModal";
import { RPC_URL } from "../../utils/constants";

type DomEvent = {
  domEvent: BaseSyntheticEvent;
  key: string;
  keyPath: Array<string>;
};

const PATHS_WITHOUT_HEADER_AND_FOOTER = [
  "/",
  "/signup",
  "/accounts/yubikey/signup",
];

const NETWORK_LOWER_TO_UPPER_MAP = {
  "devnet": "Devnet",
  "mainnet-beta": "Mainnet",
  "testnet": "Testnet"
}

const Layout = ({ children }: { children: JSX.Element }) => {
  const { network, setNetwork, account, setAccount } = useGlobalState();
  const [avatar, setAvatar] = useState<string>();

  const modalContext = useGlobalModalContext();
  const router = useRouter();

  const selectNetwork = (e: DomEvent) => {
    const networks: Array<Cluster> = ["mainnet-beta", "devnet", "testnet"];
    const selectedNetwork = networks[parseInt(e.key) - 1];
    setNetwork(selectedNetwork);
    chrome.storage.local.set({
      network: selectedNetwork,
    });
  };

  const items: MenuProps["items"] = [
    {
      key: "1",
      label: (
        <>
          Mainnet {network === "mainnet-beta" && <Badge status="processing" />}
        </>
      ),
    },
    {
      key: "2",
      label: (
        <>Devnet {network === "devnet" && <Badge status="processing" />}</>
      ),
    },
    {
      key: "3",
      label: (
        <>Testnet {network === "testnet" && <Badge status="processing" />}</>
      ),
    },
  ];

  const footerItems = [
    {
      key: "wallet",
      icon: <WalletOutlined style={{ fontSize: "23px" }} />,
      target: "/wallet",
    },
    {
      key: "nft",
      icon: <AppstoreOutlined style={{ fontSize: "23px" }} />,
      target: "/nft",
    },
    {
      key: "swap",
      icon: <SwapOutlined style={{ fontSize: "23px" }} />,
      target: "/",
    },
    {
      key: "guardian",
      icon: <TeamOutlined style={{ fontSize: "23px" }} />,
      target: "/guardian",
    },
    {
      key: "recovery",
      icon: <MedicineBoxOutlined style={{ fontSize: "23px" }} />,
      target: "/generateRecover",
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    const { target } = footerItems.find((item) => item.key === key) || {};
    if (target) {
      router.push(target);
    }
  };

  const handleAccountSwitch = () => {
    router.push("/accounts");
  };

  useEffect(() => {
    // Set account name
    if (!PATHS_WITHOUT_HEADER_AND_FOOTER.includes(router.pathname)) {
      const handleCurrAccount = async () => {
        const curr = await getCurrentAccount(modalContext);
        if (!curr) {
          return;
        }
        setAccount(curr);
        if (curr.avatar) {
          const connection = new Connection(RPC_URL(network), "confirmed");
          const avatarData = await getAvatar(
            connection,
            new PublicKey(curr.avatar)
          );
          const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
            "base64"
          )}`;
          setAvatar(avatarSVG);
        } else {
          setAvatar(undefined);
        }
      };
      handleCurrAccount();
    }
  }, [modalContext, network, router.pathname, setAccount]);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {!router.pathname.startsWith("/accounts") &&
          !router.pathname.startsWith("/adapter") &&
          !PATHS_WITHOUT_HEADER_AND_FOOTER.includes(router.pathname) && (
            <header className={styles.header}>
              <Button
                shape="round"
                onClick={handleAccountSwitch}
                size="middle"
                style={{
                  marginLeft: "10px",
                  paddingLeft: "0.9rem",
                  paddingRight: "0.6rem",
                  height: "35px",
                  alignItems: "center",
                  justifyContent: "center",
                  display: "flex",
                  border: "0.3px solid rgba(255,255,255,0.4)",
                }}
              >
                <Avatar
                  src={avatar ? avatar : "/static/images/profile.png"}
                  size="small"
                  shape="circle"
                  style={{
                    marginRight: "0.5rem",
                    fontSize: "16px",
                  }}
                  onError={() => {
                    console.log("error");
                    setAvatar(undefined);
                    return false;
                  }}
                />
                {account?.name}
                <DownOutlined style={{ fontSize: "10px" }} />
              </Button>
              {/* <div>
                <Button
                  shape="round"
                  onClick={handleAccountSwitch}
                  size="middle"
                  style={{
                    marginLeft: "10px",
                    paddingLeft: "0.9rem",
                    paddingRight: "0.6rem",
                    height: "35px",
                    alignItems: "center",
                    justifyContent: "center",
                    display: "flex",
                    borderRadius: "40% 0% 0% 40%",
                    border: "none",
                    borderRight: "1px solid #fff",
                  }}
                >
                  <Avatar
                    src={avatar ? avatar : "/static/images/profile.png"}
                    size="small"
                    shape="circle"
                    style={{
                      marginRight: "0.5rem",
                      fontSize: "16px",
                    }}
                    onError={() => {
                      console.log("error");
                      setAvatar(undefined);
                      return false;
                    }}
                  />
                  {accountName}
                </Button>
                <Button
                  style={{ borderRadius: "0% 40% 40% 0%", border: "none" }}
                >
                  <DownOutlined style={{ fontSize: "10px" }} />
                </Button>
              </div> */}

              <Menu
                mode="horizontal"
                className={styles.nav}
                selectedKeys={[router.pathname]}
              >
                <Dropdown
                  className={styles.top}
                  menu={{
                    items,
                    onClick: selectNetwork,
                  }}
                  disabled={!account}
                >
                  <a
                    className="ant-dropdown-link"
                    onClick={(e) => e.preventDefault()}
                  >
                    {NETWORK_LOWER_TO_UPPER_MAP[network!]} <DownOutlined />
                  </a>
                </Dropdown>
                <Dropdown
                  className={styles.top}
                  menu={{ items: [] }}
                  disabled={!account}
                  placement="bottomRight"
                >
                  <a
                    className="ant-dropdown-link"
                    onClick={(e) => e.preventDefault()}
                  >
                    <SettingOutlined />
                  </a>
                </Dropdown>
              </Menu>
            </header>
          )}

        {children}

        {!router.pathname.startsWith("/adapter") &&
          router.pathname != "/accounts/onboard" &&
          !PATHS_WITHOUT_HEADER_AND_FOOTER.includes(router.pathname) && (
            <footer className={styles.footerHome}>
              <Menu
                theme="dark"
                mode="horizontal"
                items={footerItems}
                onClick={handleMenuClick}
                style={{
                  backgroundColor: "rgb(34, 34, 34)",
                  alignItems: "center",
                  height: "60px",
                }}
                selectable={false}
              />
            </footer>
          )}
      </main>
    </div>
  );
};

export default Layout;
