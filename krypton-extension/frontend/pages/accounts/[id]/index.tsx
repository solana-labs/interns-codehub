import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { displayAddress } from "../../../utils";
import Link from "next/link";
import { Button, Image } from "antd";
import CopyableBox from "../../../components/CopyableBox";
import EditableBox from "../../../components/EditableBox";
import { useGlobalState } from "../../../context";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { getAvatar } from "../../../utils/avatar";
import InfoBox from "../../../components/InfoBox";
import { RPC_URL } from "../../../utils/constants";

const Account: NextPage = () => {
  const router = useRouter();
  const { network } = useGlobalState();
  const [accountName, setAccountName] = useState<string>("");
  const [pk, setPk] = useState<string>("");
  const [pda, setPda] = useState<string>("");
  const [avatar, setAvatar] = useState<string>();
  const [keypairBalance, setKeypairBalance] = useState<number>(0);
  const [oneAccountLeft, setOneAccountLeft] = useState<boolean>(false);

  let { id, mode } = router.query;
  if (!id) {
    id = "1";
  }
  if (Array.isArray(id)) {
    id = id[0];
  }
  const selectedId = parseInt(id);

  if (!mode) {
    mode = "0";
  }
  if (Array.isArray(mode)) {
    mode = mode[0];
  }
  const selectedMode = parseInt(mode);

  const handleNameChange = (newName: string) => {
    chrome.storage.local.get(["accounts", "y_accounts"], (res) => {
      const accountRes =
        selectedMode === 0 ? res["accounts"] : res["y_accounts"];
      if (accountRes != null) {
        const old = JSON.parse(accountRes);
        for (const key in old) {
          if (key === id) {
            old[id]["name"] = newName;
            setAccountName(newName);
            break;
          }
        }
        const values = JSON.stringify(old);
        if (selectedMode === 0) {
          chrome.storage.local.set({ accounts: values });
        } else if (selectedMode === 1) {
          chrome.storage.local.set({ y_accounts: values });
        }
      } else {
        return false;
      }
    });
  };

  const handleDelete = () => {
    chrome.storage.local.get(["accounts", "y_accounts"], (res) => {
      var accountRes = selectedMode == 0 ? res["accounts"] : res["y_accounts"];
      if (accountRes != null) {
        var old = JSON.parse(accountRes);

        for (var key in old) {
          if (key == id) {
            delete old[id];
            const standardAccountRes = JSON.parse(res["accounts"]);
            const standardAccountFirstId = Number(
              Object.keys(standardAccountRes)[0]
            );
            // const firstAccountId = selectedMode === 0 ? Number(Object.keys(old)[0]) : standardAccountFirstId;
            chrome.storage.local.set({
              currId: standardAccountFirstId,
              pk: standardAccountRes[standardAccountFirstId]["pk"],
              mode: 0,
            });
            var values = JSON.stringify(old);
            if (selectedMode == 0) {
              chrome.storage.local.set({ accounts: values });
            } else if (selectedMode == 1) {
              chrome.storage.local.set({ y_accounts: values });
            }
            router.push("/accounts");
            break;
          }
        }
      } else {
        return false;
      }
    });
  };

  // check if there is only one standard account left
  useEffect(() => {
    if (selectedMode == 0) {
      chrome.storage.local.get(["accounts"], (res) => {
        const accountRes = JSON.parse(res["accounts"]);
        const count = Object.keys(accountRes).length;
        setOneAccountLeft(count === 1);
      });
    }
  }, [selectedMode]);

  useEffect(() => {
    chrome.storage.local
      .get(["accounts", "y_accounts"])
      .then(async (result) => {
        setAvatar(undefined);
        let accountObj: any = {};
        if (selectedMode === 0) {
          accountObj = JSON.parse(result["accounts"]);
        } else if (selectedMode === 1) {
          accountObj = JSON.parse(result["y_accounts"]);
        }
        const name = accountObj[selectedId]["name"];
        const pk = accountObj[selectedId]["pk"];
        const pda = accountObj[selectedId]["pda"];
        const connection = new Connection(RPC_URL(network), "confirmed");
        const keypairBalance = await connection.getBalance(new PublicKey(pk));
        setAccountName(name);
        setPk(pk);
        setPda(pda);
        setKeypairBalance(keypairBalance / LAMPORTS_PER_SOL);
        if (accountObj[selectedId]["avatar"]) {
          const connection = new Connection(RPC_URL(network), "confirmed");
          const avatarData = await getAvatar(
            connection,
            new PublicKey(accountObj[selectedId]["avatar"])
          );
          const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
            "base64"
          )}`;
          setAvatar(avatarSVG);
        }
      });
  }, [network, selectedId, selectedMode]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Link href="/accounts" passHref>
          <a
            style={{
              position: "absolute",
              left: "30px",
              top: "30px",
              fontSize: "16px",
            }}
          >
            <ArrowLeftOutlined /> Back
          </a>
        </Link>

        <h1 className={"title"}>Account Info</h1>
      </div>

      <EditableBox
        fieldName="Name"
        value={accountName}
        handleChange={handleNameChange}
      />
      <CopyableBox
        fieldName="Wallet Address"
        value={displayAddress(pda)}
        copyableValue={pda}
      />
      <CopyableBox
        fieldName="Keypair Address"
        value={displayAddress(pk)}
        copyableValue={pk}
      />
      <InfoBox fieldName="Keypair Balance" value={`${keypairBalance} SOL`} />
      <Image
        width={"23%"}
        style={{
          alignItems: "center",
          marginTop: "15px",
        }}
        alt="profile avatar"
        src={avatar ? avatar : "/static/images/profile.png"}
        onError={() => {
          console.log("error");
          setAvatar(undefined);
        }}
      />
      {!oneAccountLeft && (
        <Button
          type="primary"
          onClick={handleDelete}
          style={{ marginTop: "20px" }}
          danger
        >
          Delete
        </Button>
      )}
    </>
  );
};

export default Account;
