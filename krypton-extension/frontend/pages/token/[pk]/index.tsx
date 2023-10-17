import React, { useEffect, useMemo, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { Button, Skeleton } from "antd";
import { useGlobalState } from "../../../context";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { displayAddress } from "../../../utils";
import { Connection, PublicKey } from "@solana/web3.js";
import styles from "../../../components/Layout/index.module.css";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
  getMint,
} from "@solana/spl-token";
import Link from "next/link";
import { RPC_URL } from "../../../utils/constants";
import {
  getTokenIconString,
  getTokenMap,
  getTokenName,
} from "../../../utils/tokenIcon";
import CopyableBoxSimple from "../../../components/CopyableBox/simple";

const Token: NextPage = () => {
  const router = useRouter();
  const { account, network } = useGlobalState();
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenDecimals, setTokenDecimals] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenIconStr, setTokenIconStr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  let { pk } = router.query;
  if (!pk) {
    pk = "";
  }
  if (Array.isArray(pk)) {
    pk = pk[0];
  }
  const mint_pk = useMemo(
    () => (pk ? new PublicKey(pk) : PublicKey.default),
    [pk]
  );
  const connection = useMemo(
    () => new Connection(RPC_URL(network), "confirmed"),
    [network]
  );

  useEffect(() => {
    setLoading(true);
    if (!account) {
      return;
    }
    const getMintInfo = async () => {
      console.log("Getting src token account...");
      const srcAssociatedToken = await getAssociatedTokenAddress(
        mint_pk,
        new PublicKey(account.pda) ?? PublicKey.default,
        true,
        TOKEN_PROGRAM_ID
      );
      const srcTokenAccount = await getAccount(
        connection,
        srcAssociatedToken,
        "confirmed",
        TOKEN_PROGRAM_ID
      );
      console.log(`Src Token Account: ${srcTokenAccount.address.toBase58()}`);

      const tokenAccountData = await getAccount(
        connection,
        srcTokenAccount.address
      );
      const balance = Number(tokenAccountData.amount);
      const mintData = await getMint(connection, mint_pk);
      const decimals = Number(mintData.decimals);
      setTokenBalance(balance);
      setTokenDecimals(decimals);
      console.log("DESIRED BALANCE: ", balance);
      console.log("CURRENT BALANCE: ", tokenBalance);

      const tokenMap = await getTokenMap(network!);
      const tokenName = await getTokenName(mint_pk.toBase58(), tokenMap);
      const tokenIconStr = await getTokenIconString(
        mint_pk.toBase58(),
        tokenMap
      );
      setTokenName(tokenName);
      setTokenIconStr(tokenIconStr);
      setLoading(false);
    };
    getMintInfo();
  }, [connection, mint_pk, account, router, tokenBalance]);

  const handleClick = () => {
    router.push({
      pathname: "/token/[pk]/send",
      query: { pk: pk },
    });
  };

  return (
    <>
      {loading && (
        <Skeleton active={true} style={{ marginTop: "6rem", width: "85%" }} />
      )}
      {!loading && (
        <>
          <h1 className={"title"}>{tokenName ?? "Unknown Token"}</h1>
          <CopyableBoxSimple value={displayAddress(pk)} copyableValue={pk} />
          <p>balance: {tokenBalance / Math.pow(10, tokenDecimals)}</p>
          <img
            style={{
              alignItems: "center",
              width: "23%",
              height: "20%",
              margin: "20px 20px",
            }}
            src={tokenIconStr ?? "/static/images/token.png"}
            alt="token image"
          ></img>

          <Button
            type="primary"
            style={{
              width: "140px",
              height: "40px",
              fontSize: "17px",
              marginTop: "1rem",
            }}
            onClick={handleClick}
          >
            Send
          </Button>
        </>
      )}
      <Link href="/wallet" passHref>
        <a
          className={styles.back}
          style={{ position: "absolute", bottom: "6rem" }}
        >
          <ArrowLeftOutlined /> Back Home
        </a>
      </Link>
    </>
  );
};

export default Token;
