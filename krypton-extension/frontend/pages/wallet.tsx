import React, { ReactNode, useEffect, useState } from "react";
import { NextPage } from "next";
import {
  Button,
  Tooltip,
  List,
  Avatar,
  Skeleton,
  Empty,
  Alert,
  Space,
} from "antd";
import { useGlobalState } from "../context";
import { useRouter } from "next/router";
import {
  refreshBalance,
  handleAirdrop,
  displayAddress,
  sendAndConfirmTransactionWithAccount,
} from "../utils";
import { Dashboard } from "../styles/StyledComponents.styles";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  MIN_KEYPAIR_BALANCE,
  REFILL_TO_BALANCE,
  RPC_URL,
  WALLET_PROGRAM_ID,
} from "../utils/constants";
import BN from "bn.js";
import { KeypairSigner, Signer } from "../types/account";
import Paragraph from "antd/lib/typography/Paragraph";
import {
  getTokenIconString,
  getTokenMap,
  getTokenName,
} from "../utils/tokenIcon";

const Wallet: NextPage = () => {
  const { network, balance, setBalance, account, setTokens, currId } =
    useGlobalState();
  const [spinning, setSpinning] = useState<boolean>(true);
  const [reimbursed, setReimbursed] = useState<boolean>(false);
  const [canReimburse, setCanReimburse] = useState<boolean>(true);
  const [reimburseMsg, setReimburseMsg] = useState<ReactNode>("");
  const [fungibleTokens, setFungibleTokens] = useState<
    Array<[PublicKey, bigint, number, string | null, string | null]>
  >([]);
  const [airdropLoading, setAirdropLoading] = useState<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    console.log("============WALLET PAGE=================");

    if (!account) {
      router.push("/");
      return;
    }
    console.log(account);

    refreshBalance(network, new PublicKey(account.pk))
      .then((updatedBalance) => {
        setBalance(updatedBalance);
      })
      .catch((err) => {
        console.log(err);
      });

    // Fetching all tokens from PDA and filter out fungible tokens
    const getTokens = async () => {
      const connection = new Connection(RPC_URL(network), "confirmed");
      const publicKey = new PublicKey(account.pk);
      console.log("account pk: ", publicKey.toBase58());
      const profile_pda = new PublicKey(account.pda);
      const tokens_tmp: Array<[PublicKey, bigint, number]> = [];
      const fungible_tokens_tmp: Array<
        [PublicKey, bigint, number, string | null, string | null]
      > = [[PublicKey.default, BigInt(0), 0, null, null]];
      const allTA_res = await connection.getTokenAccountsByOwner(profile_pda, {
        programId: TOKEN_PROGRAM_ID,
      });

      const tokenMap = await getTokenMap(network);

      for (const e of allTA_res.value) {
        const accountInfo = AccountLayout.decode(e.account.data);

        const mint = new PublicKey(accountInfo.mint);
        const amount = accountInfo.amount;
        const mintData = await connection.getTokenSupply(mint);
        const decimals = mintData.value.decimals;
        tokens_tmp.push([mint, amount, decimals]);
        if (decimals > 0) {
          console.log(`mint: ${mint}`);
          const iconStr = await getTokenIconString(mint.toBase58(), tokenMap);
          const name = await getTokenName(mint.toBase58(), tokenMap);
          fungible_tokens_tmp.push([mint, amount, decimals, name ?? "Unknown Token", iconStr ?? "/static/images/token.png"]);
        }
      }

      // sort all tokens based on name
      const sortedFungibleTokensSlice = fungible_tokens_tmp
        .slice(1)
        .sort((t1, t2) => {
          const t1Name = t1[3] ?? "";
          const t2Name = t2[3] ?? "";
          if (t1Name > t2Name) {
            return 1;
          } else if (t1Name < t2Name) {
            return -1;
          }
          return 0;
        });
      const finalFungibleTokens = [fungible_tokens_tmp[0]].concat(
        sortedFungibleTokensSlice
      );
      setTokens(tokens_tmp);
      setFungibleTokens(finalFungibleTokens);
      setSpinning(false);
    };
    getTokens();
  }, [router, network, currId, reimbursed, account, setBalance, setTokens]);

  useEffect(() => {
    if (!account) {
      router.push("/");
      return;
    }

    const checkReimburse = async () => {
      const connection = new Connection(RPC_URL(network), "confirmed");
      const keypairPK = new PublicKey(account.pk);
      const keypairBalance = await connection.getBalance(keypairPK);
      if (keypairBalance < MIN_KEYPAIR_BALANCE) {
        console.log("REFILL NEEEDED!");
        const reimbursementAmount = REFILL_TO_BALANCE - keypairBalance + 5000;
        console.log("reimbursement amount: ", reimbursementAmount);
        const pdaBalance = await connection.getBalance(
          new PublicKey(account.pda)
        );
        console.log("balance: ", pdaBalance);
        if (pdaBalance < reimbursementAmount) {
          setCanReimburse(false);
          return;
        }

        /* TRANSACTION: Transfer Native SOL */
        const idx = Buffer.from(new Uint8Array([7]));
        const amountBuf = Buffer.from(
          new Uint8Array(new BN(reimbursementAmount).toArray("le", 8))
        );
        const recoveryModeBuf = Buffer.from(new Uint8Array([0]));

        const recentBlockhash = await connection.getLatestBlockhash();
        const transferSOLTx = new Transaction({
          // TODO:  Check if Yubikey is connected
          feePayer: await account.getPublicKey(),
          ...recentBlockhash,
        });
        let newaccount = account as Signer;
        if (!newaccount) {
          newaccount = new KeypairSigner(new Keypair());
        }
        transferSOLTx.add(
          new TransactionInstruction({
            keys: [
              {
                pubkey: new PublicKey(account.pda) ?? PublicKey.default,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: keypairPK,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: keypairPK,
                isSigner: true,
                isWritable: true,
              },
            ],
            programId: WALLET_PROGRAM_ID,
            data: Buffer.concat([idx, amountBuf, recoveryModeBuf]),
          })
        );

        console.log("Transfering native SOL...");
        const transfer_sol_txid = await sendAndConfirmTransactionWithAccount(
          connection,
          transferSOLTx,
          [newaccount],
          {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            commitment: "confirmed",
          }
        );
        console.log(
          `https://explorer.solana.com/tx/${transfer_sol_txid}?cluster=${network}\n`
        );

        const msg = (
          <p style={{ color: "black" }}>
            Keypair balance was insufficient for signing. <br />
            {`Transfered
        ${(reimbursementAmount / LAMPORTS_PER_SOL).toString()} `}
            SOL from wallet to keypair and new keypair balance is 0.2 SOL.
            <br />
            <b>Note:</b> Krypton will automatically refill your keypair to 0.2
            SOL when its balance is below 0.1 SOL.
          </p>
        );

        setReimbursed(true);
        setReimburseMsg(msg);
      }
    };
    checkReimburse();
  }, [account, balance, network, router]);

  const airdrop = async () => {
    if (!account) {
      return;
    }
    setAirdropLoading(true);
    const updatedBalance = await handleAirdrop(
      network ?? "devnet",
      new PublicKey(account.pk)
    );
    if (typeof updatedBalance === "number") {
      setBalance(updatedBalance);
    }
    setAirdropLoading(false);
  };

  const handleSend = () => {
    router.push("/transfer");
  };

  return (
    <>
      {account && (
        <Dashboard>
          <h1 style={{ marginBottom: 0, color: "#fff" }}>Dashboard</h1>

          {reimbursed && (
            <Space
              direction="vertical"
              style={{
                width: "82%",
                position: "absolute",
                top: "-30px",
                zIndex: "3",
              }}
            >
              <Alert
                message="Automatic Refill Success"
                description={reimburseMsg}
                type="success"
                showIcon
                closable
              />
            </Space>
          )}

          {!canReimburse && (
            <Space
              direction="vertical"
              style={{
                width: "80%",
                position: "absolute",
                top: "-30px",
                zIndex: "3",
              }}
            >
              <Alert
                message="Automatic Refill Failed"
                description="Please deposit SOL into your wallet so you can sign for transactions"
                type="error"
                showIcon
                closable
              />
            </Space>
          )}

          <Paragraph
            copyable={{ text: account.pda, tooltips: `Copy` }}
            style={{ margin: 0, color: "#fff" }}
          >
            {`${displayAddress(account.pda)}`}
          </Paragraph>

          <div
            style={{
              display: "flex",
              columnGap: "10px",
              justifyContent: "space-between",
              marginTop: "15px",
              marginBottom: "10px",
            }}
          >
            {network === "devnet" && account && (
              <>
                <Button
                  type="primary"
                  shape="default"
                  onClick={airdrop}
                  style={{ width: "140px", height: "40px", fontSize: "17px" }}
                  loading={airdropLoading}
                >
                  Airdrop
                </Button>
                <Tooltip
                  title="Click to receive 1 devnet SOL into your account"
                  placement="right"
                ></Tooltip>
              </>
            )}
            <Button
              type="primary"
              shape="default"
              style={{ width: "140px", height: "40px", fontSize: "17px" }}
              onClick={handleSend}
            >
              Send
            </Button>
          </div>

          <div
            style={{
              marginLeft: "30px",
              marginRight: "30px",
              marginTop: "21px",
              width: "77%",
              padding: "0.2rem 0.7rem",
              backgroundColor: "rgb(42, 42, 42)",
              overflowY: "auto",
              maxHeight: "278px",
            }}
          >
            <List
              dataSource={fungibleTokens}
              locale={{
                emptyText: spinning ? <Skeleton active={true} /> : <Empty />,
              }}
              renderItem={(item) => (
                <List.Item
                  key={item[0].toBase58()}
                  onClick={() => {
                    if (item[0] === PublicKey.default) {
                      handleSend();
                    } else {
                      router.push({
                        pathname: "/token/[pk]",
                        query: { pk: item[0].toBase58() ?? null },
                      });
                    }
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={
                          item[0] === PublicKey.default
                            ? "/static/images/solana.png"
                            : item[4]
                        }
                      />
                    }
                    title={item[0] === PublicKey.default ? "Solana" : item[3]}
                    description={
                      item[0] === PublicKey.default
                        ? `${balance} SOL`
                        : displayAddress(item[0].toBase58())
                    }
                  />
                  {item[0] != PublicKey.default && (
                    <p>
                      {(Number(item[1]) / Math.pow(10, item[2])).toString()}
                    </p>
                  )}
                </List.Item>
              )}
            />
          </div>
        </Dashboard>
      )}
    </>
  );
};

export default Wallet;
