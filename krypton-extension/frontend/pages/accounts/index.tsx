import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import {
  List,
  Avatar,
  Button,
  Skeleton,
  Dropdown,
  Space,
  MenuProps,
} from "antd";
import { useGlobalState } from "../../context";
import {
  UserAddOutlined,
  MoreOutlined,
  CloseOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { displayAddress, getAccountFromPkString } from "../../utils";
import { useRouter } from "next/router";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import Link from "next/link";
import { getAvatar } from "../../utils/avatar";
import { useGlobalModalContext } from "../../components/GlobalModal";
import { RPC_URL, WALLET_PROGRAM_ID } from "../../utils/constants";

const AccountList: NextPage = () => {
  const { network, setBalance, setAccount, setCurrId } = useGlobalState();

  const [allAccounts, setAllAccounts] = useState<
    Array<[number, number, string, string, string?]>
  >([]);
  const [standardAccounts, setStandardAccounts] = useState<
    Array<[number, number, string, string, string?]>
  >([]);
  const [yubikeyAccounts, setYubikeyAccounts] = useState<
    Array<[number, number, string, string, string?]>
  >([]);
  const [currAccounts, setCurrAccounts] = useState<
    Array<[number, number, string, string, string?]>
  >([]);
  const [filter, setFilter] = useState<string>("All");

  const [spinning, setSpinning] = useState<boolean>(true);
  const router = useRouter();

  const onClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "1") {
      setCurrAccounts(allAccounts);
      setFilter("All");
    } else if (key === "2") {
      setCurrAccounts(standardAccounts);
      setFilter("Standard");
    } else if (key === "3") {
      setCurrAccounts(yubikeyAccounts);
      setFilter("Yubikey");
    }
  };

  const items: MenuProps["items"] = [
    {
      label: "All",
      key: "1",
    },
    {
      label: "Standard",
      key: "2",
    },
    {
      label: "Yubikey",
      key: "3",
    },
  ];

  useEffect(() => {
    // Fetching all accounts from chrome storage
    chrome.storage.local
      .get(["accounts", "y_accounts"])
      .then(async (result) => {
        const accountTmp: Array<[number, number, string, string, string?]> = [];
        const yubikeyAccountTmp: Array<
          [number, number, string, string, string?]
        > = [];

        if (result["accounts"] != undefined) {
          const accountObj = JSON.parse(result["accounts"]);

          for (const id in accountObj) {
            const name = accountObj[id].name;
            const pda = accountObj[id].pda;
            if (accountObj[id].avatar) {
              const connection = new Connection(RPC_URL(network), "confirmed");
              const avatarData = await getAvatar(
                connection,
                new PublicKey(accountObj[id].avatar)
              );
              const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
                "base64"
              )}`;
              accountTmp.push([0, Number(id), name, pda, avatarSVG]);
            } else {
              accountTmp.push([0, Number(id), name, pda]);
            }
          }
          setStandardAccounts(accountTmp);
          setSpinning(false);
        }

        if (result["y_accounts"] != undefined) {
          console.log(result["y_accounts"]);
          const accountObj = JSON.parse(result["y_accounts"]);
          for (const id in accountObj) {
            const name = accountObj[id].name;
            const pda = accountObj[id].pda;
            if (accountObj[id].avatar) {
              const connection = new Connection(RPC_URL(network), "confirmed");
              const avatarData = await getAvatar(
                connection,
                new PublicKey(accountObj[id].avatar)
              );
              const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
                "base64"
              )}`;
              yubikeyAccountTmp.push([1, Number(id), name, pda, avatarSVG]);
            } else {
              yubikeyAccountTmp.push([1, Number(id), name, pda]);
            }
          }
          setYubikeyAccounts(yubikeyAccountTmp);
          setSpinning(false);
        }
        const allAccountsTmp = [...accountTmp, ...yubikeyAccountTmp];
        setAllAccounts(allAccountsTmp);
        setCurrAccounts(allAccountsTmp);
      });
  }, [network]);

  const handleAddAccount = () => {
    router.push("/accounts/onboard");
  };

  const modalContext = useGlobalModalContext();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Link href="/wallet" passHref>
          <a
            style={{
              position: "absolute",
              left: "30px",
              top: "30px",
              fontSize: "16px",
            }}
          >
            <CloseOutlined />
          </a>
        </Link>

        <h1 className={"title"}>Accounts</h1>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <Dropdown menu={{ items, onClick }}>
          <a onClick={(e) => e.preventDefault()}>
            <Space>
              {filter}
              <DownOutlined />
            </Space>
          </a>
        </Dropdown>
      </div>

      <div className={"tokenlist"}>
        <List
          dataSource={currAccounts}
          locale={{
            emptyText: spinning ? (
              <Skeleton active={true} />
            ) : (
              <Skeleton active={false} />
            ),
          }}
          renderItem={(item) => (
            <List.Item
              key={item[3]}
              onClick={async () => {
                console.log("=============SWITCHING ACCOUNT===============");
                const mode = item[0];
                const id = item[1];
                if (mode === 0) {
                  chrome.storage.local.set({ currId: id });
                  setCurrId(id);
                } else if (mode === 1) {
                  chrome.storage.local.set({ y_id: id });
                }
                await chrome.storage.local
                  .get(["accounts", "y_accounts"])
                  .then(async (result) => {
                    let publicKey = "";
                    if (mode === 0) {
                      const accountObj = JSON.parse(result["accounts"]);
                      publicKey = accountObj[id]["pk"];
                      chrome.storage.local.set({ mode: 0 });
                    } else if (mode === 1) {
                      const accountObj = JSON.parse(result["y_accounts"]);
                      publicKey = accountObj[id]["pk"];
                      chrome.storage.local.set({ mode: 1 });
                    }
                    chrome.storage.local.set({ pk: publicKey });

                    // TODO: Detoxify this
                    const curr = await getAccountFromPkString(
                      publicKey,
                      modalContext
                    );
                    if (!curr) {
                      return;
                    }
                    setAccount(curr);
                    const connection = new Connection(
                      RPC_URL(network),
                      "confirmed"
                    );
                    const balance1 = await connection.getBalance(
                      new PublicKey(curr.pda)
                    );
                    setBalance(balance1 / LAMPORTS_PER_SOL);
                  });

                setTimeout(() => router.push("/wallet"), 60);
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={
                      item.length > 4 ? item[4] : "/static/images/profile.png"
                    }
                  />
                }
                title={item[2]}
                description={displayAddress(item[3])}
              />

              <Button
                type="text"
                shape="circle"
                icon={<MoreOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push({
                    pathname: "/accounts/[id]",
                    query: { id: item[1], mode: item[0] },
                  });
                }}
                className="more-button"
              />
            </List.Item>
          )}
        />
      </div>

      <Button
        type="primary"
        icon={<UserAddOutlined />}
        onClick={handleAddAccount}
        size="middle"
        style={{ position: "absolute", bottom: "87px", width: "85%" }}
      >
        Create/Add New Account
      </Button>
    </>
  );
};

export default AccountList;
