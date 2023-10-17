import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { List, Avatar, Skeleton, Empty } from "antd";
import { useGlobalState } from "../../context";
import { Connection, PublicKey } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { displayAddress } from "../../utils";
import { useRouter } from "next/router";
import { RPC_URL, WALLET_PROGRAM_ID } from "../../utils/constants";
import { Metaplex } from "@metaplex-foundation/js";

const NFT: NextPage = () => {
  const { network, setTokens, account } = useGlobalState();
  const [nfts, setNfts] = useState<
    Array<[PublicKey, bigint, number, string, string]>
  >([]);
  const [spinning, setSpinning] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    if (!account) {
      return;
    }
    // Fetching all tokens from PDA
    const getTokens = async () => {
      const connection = new Connection(RPC_URL(network), "confirmed");
      const publicKey = new PublicKey(account.pk);
      const pda = new PublicKey(account.pda);
      console.log("account: ", publicKey.toBase58());
      console.log("PDA: ", account.pda);

      const tokens_tmp: Array<[PublicKey, bigint, number]> = [];
      const nfts_tmp: Array<[PublicKey, bigint, number, string, string]> = [];
      const allTA_res = await connection.getTokenAccountsByOwner(
        new PublicKey(account.pda),
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      for (const e of allTA_res.value) {
        const accountInfo = AccountLayout.decode(e.account.data);

        const mint = new PublicKey(accountInfo.mint);
        const amount = accountInfo.amount;
        const mintData = await connection.getTokenSupply(mint);
        const decimals = mintData.value.decimals;

        tokens_tmp.push([mint, amount, decimals]);
        if (decimals === 0 && Number(amount) != 0) {
          console.log(`mint: ${mint}`);
          if (network == "mainnet-beta") {
            let metaplex = Metaplex.make(connection);
            const nft = await metaplex
              .nfts()
              .findByMint({ mintAddress: mint, tokenOwner: pda });
            const name = nft.name;
            const imageUri = nft.json?.image;
            nfts_tmp.push([
              mint,
              amount,
              decimals,
              name,
              imageUri ?? "/static/images/token.png",
            ]);
          } else {
            nfts_tmp.push([
              mint,
              amount,
              decimals,
              "Unknown NFT",
              "/static/images/token.png",
            ]);
          }
        }
      }
      setTokens(tokens_tmp);
      setNfts(nfts_tmp);
      setSpinning(false);
    };
    getTokens();
  }, [account, network, setTokens]);

  return (
    <>
      <h1 className={"title"}>NFT Collection</h1>
      <div className={"tokenlist"}>
        <List
          dataSource={nfts}
          locale={{
            emptyText: spinning ? <Skeleton active={true} /> : <Empty />,
          }}
          renderItem={(item) => (
            <List.Item
              key={item[0].toBase58()}
              onClick={() => {
                router.push({
                  pathname: "/nft/[pk]",
                  query: { pk: item[0].toBase58() ?? null },
                });
              }}
            >
              <List.Item.Meta
                avatar={<Avatar src={item[4]} />}
                title={item[3] ?? "Unknown NFT"}
                description={displayAddress(item[0].toBase58())}
              />
            </List.Item>
          )}
        />
      </div>
    </>
  );
};

export default NFT;
