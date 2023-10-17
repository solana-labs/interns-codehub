import React, { useEffect, useMemo, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { Button, Skeleton } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { displayAddress } from "../../../utils";
import styles from "../../../components/Layout/index.module.css";
import Link from "next/link";
import { Connection, PublicKey } from "@solana/web3.js";
import { RPC_URL } from "../../../utils/constants";
import { useGlobalState } from "../../../context";
import { Metaplex } from "@metaplex-foundation/js";
import CopyableBoxSimple from "../../../components/CopyableBox/simple";

const Token: NextPage = () => {
  const router = useRouter();
  const { account, network } = useGlobalState();
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
    const getNFT = async () => {
      let name = "Unknown NFT";
      let imageUri = "/static/images/token.png";
      if(network == "mainnet-beta") {
        const pda = new PublicKey(account!.pda);
        let metaplex = Metaplex.make(connection);
        const nft = await metaplex
          .nfts()
          .findByMint({ mintAddress: mint_pk, tokenOwner: pda });
        name = nft.name;
        imageUri = nft.json?.image ?? "/static/images/token.png";
      }
      setTokenName(name);
      setTokenIconStr(imageUri!);
      setLoading(false);
    };

    getNFT();
  }, [connection, mint_pk, account, router]);

  const handleClick = () => {
    router.push({
      pathname: "/nft/[pk]/send",
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
          <img
            style={{
              alignItems: "center",
              width: "23%",
              height: "20%",
              margin: "20px 20px",
            }}
            src={tokenIconStr ?? "/static/images/token.png"}
            alt="nft image"
          ></img>
          <Button
            type="primary"
            //   loading={loading}
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
