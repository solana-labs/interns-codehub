import React, { useState } from "react";
import { Button, Result } from "antd";
import { Box } from "../../styles/StyledComponents.styles";
import { LoadingOutlined } from "@ant-design/icons";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  AccountLayout,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { useGlobalState } from "../../context";
import Axios from "axios";
import {
  getProfilePDA,
  sendAndConfirmTransactionWithAccount,
} from "../../utils";
import BN from "bn.js";
import Paragraph from "antd/lib/typography/Paragraph";
import Text from "antd/lib/typography/Text";
import { RPC_URL, WALLET_PROGRAM_ID } from "../../utils/constants";

const RecoverBox = ({ old_pk }: { old_pk: PublicKey }) => {
  const { account } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [succeeded, setSucceeded] = useState<boolean>(false);
  const [msg, setMsg] = useState<any>("");
  const { network } = useGlobalState();
  const connection = new Connection(RPC_URL(network), "confirmed");

  if (!account) {
    return <></>;
  }

  const onRecover = async () => {
    try {
      console.log("\n=====RECOVERING======");
      const feePayerPK = new PublicKey(account.pk);
      console.log("Signer: ", account.pk);
      setLoading(true);
      const res = await Axios.get(
        "http://localhost:5000/api/getFromPk/" + old_pk
      );
      const res_data = res.data[0];
      if (res_data == undefined) {
        throw new Error("Invalid signing request!");
      }

      const transactionBased64 = res_data.transaction;
      const transaction = Transaction.from(
        Buffer.from(transactionBased64, "base64")
      );
      console.log("SIGNATURES");
      for (let i = 0; i < transaction.signatures.length; i++) {
        console.log(
          `pk ${i}: ${transaction.signatures[
            i
          ].publicKey.toBase58()} \nsignature ${i}: `,
          transaction.signatures[i].signature?.toString("base64")
        );
      }

      if (!transaction.verifySignatures())
        throw new Error(`Transaction signature invalid! `);
      console.log("Transaction signature valid! ");

      // Serialize the transaction to send it using connection.sendEncodedTransaction
      // We have to do this because connection.sendTransaction uses sign (and rejects if we pass it no new signers)
      const serialized = transaction.serialize({
        requireAllSignatures: true,
        verifySignatures: true,
      });
      console.log("Transaction serialized!");

      /* TRANSACTION: Transfer and close all token accounts */
      const profile_pda = getProfilePDA(new PublicKey(res_data.pk));
      const new_profile_pda = getProfilePDA(new PublicKey(res_data.new_pk));
      const allTA_res = await connection.getTokenAccountsByOwner(
        profile_pda[0],
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      const recentBlockhash0 = await connection.getLatestBlockhash();
      // TODO: Check if Yubikey is connected
      const transferCloseTx = new Transaction({
        feePayer: feePayerPK,
        ...recentBlockhash0,
      });

      allTA_res.value.forEach(async (e) => {
        const oldTokenAccount = e.pubkey;
        const accountInfo = AccountLayout.decode(e.account.data);

        const mint = new PublicKey(accountInfo.mint);
        const amount = accountInfo.amount;
        const recoveryMode = 1;

        console.log(`Old Token Account: ${oldTokenAccount.toBase58()}`);
        console.log(`mint: ${mint}`);
        console.log(`amount: ${amount}`);
        console.log(`recovery mode: ${recoveryMode}\n`);

        console.log("Getting associated token address...");
        const associatedToken = await getAssociatedTokenAddress(
          mint,
          new_profile_pda[0],
          true,
          TOKEN_PROGRAM_ID
        );

        console.log("Creating token account for mint...");
        const recentBlockhash = await connection.getLatestBlockhash();
        // TODO: Check if Yubikey is connected
        const createTA_tx = new Transaction({
          feePayer: feePayerPK,
          ...recentBlockhash,
        }).add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(account.pk),
            associatedToken,
            new_profile_pda[0],
            mint,
            TOKEN_PROGRAM_ID
          )
        );

        await sendAndConfirmTransactionWithAccount(
          connection,
          createTA_tx,
          [account],
          {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            commitment: "confirmed",
          }
        );

        // const newTokenAccount = await getOrCreateAssociatedTokenAccount(
        //   connection,
        //   account ?? new Keypair(),
        //   mint,
        //   new_profile_pda[0],
        //   true
        // );
        console.log("Getting sender token account...");
        const newTokenAccount = await getAccount(
          connection,
          associatedToken,
          "confirmed",
          TOKEN_PROGRAM_ID
        );
        console.log(`New Token Account: ${newTokenAccount.address.toBase58()}`);

        const idx2 = Buffer.from(new Uint8Array([6]));
        const amountBuf = Buffer.from(
          new Uint8Array(new BN(Number(amount)).toArray("le", 8))
        );
        const recoveryModeBuf = Buffer.from(new Uint8Array([recoveryMode]));
        const transferAndCloseIx = new TransactionInstruction({
          keys: [
            {
              pubkey: profile_pda[0],
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: new PublicKey(res_data.pk),
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: feePayerPK,
              isSigner: true,
              isWritable: true,
            },
            {
              pubkey: oldTokenAccount,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: newTokenAccount.address,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: TOKEN_PROGRAM_ID,
              isSigner: false,
              isWritable: false,
            },
          ],
          programId: WALLET_PROGRAM_ID,
          data: Buffer.concat([idx2, amountBuf, recoveryModeBuf]),
        });

        transferCloseTx.add(transferAndCloseIx);
      });

      /* TRANSACTION: Recover Transaction */
      // Send the transaction
      const signature = await connection.sendEncodedTransaction(
        serialized.toString("base64")
      );
      console.log("Recovering Wallet: ");
      console.log(
        `https://explorer.solana.com/tx/${signature}?cluster=${network}\n`
      );

      // Wait for it to finish
      let recentBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          blockhash: recentBlockhash.blockhash,
          lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
          signature,
        },
        "confirmed"
      );

      await new Promise((resolve) => setTimeout(resolve, 7000));

      /* TRANSACTION: Transfer Native SOL */
      const idx3 = Buffer.from(new Uint8Array([7]));
      const amountBuf1 = Buffer.from(
        new Uint8Array(new BN(Number(1)).toArray("le", 8))
      );
      const recoveryModeBuf1 = Buffer.from(new Uint8Array([1]));

      recentBlockhash = await connection.getLatestBlockhash();
      // TODO: Check if Yubikey is connected
      const transferSOLTx = new Transaction({
        feePayer: feePayerPK,
        ...recentBlockhash,
      }).add(
        new TransactionInstruction({
          keys: [
            {
              pubkey: profile_pda[0],
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: new_profile_pda[0],
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: feePayerPK,
              isSigner: true,
              isWritable: true,
            },
          ],
          programId: WALLET_PROGRAM_ID,
          data: Buffer.concat([idx3, amountBuf1, recoveryModeBuf1]),
        })
      );

      console.log("Transfering native SOL...");
      const transfer_sol_txid = await sendAndConfirmTransactionWithAccount(
        connection,
        transferSOLTx,
        [account],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        }
      );
      console.log(
        `https://explorer.solana.com/tx/${transfer_sol_txid}?cluster=${network}\n`
      );

      /* TRANSACTION: Transfer and close all token accounts */
      console.log("Transfering and closing...");
      const transfer_txid = await sendAndConfirmTransactionWithAccount(
        connection,
        transferCloseTx,
        [account],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        }
      );
      console.log(
        `https://explorer.solana.com/tx/${transfer_txid}?cluster=${network}\n`
      );

      await Axios.delete("http://localhost:5000/api/delete/" + old_pk);

      console.log("RECOVERY COMPLETED! LET'S GOOOOO!");

      setSucceeded(true);
    } catch (err: any) {
      setSucceeded(false);
      setMsg(err.toString());
      console.error(err);
    }
    setFinished(true);
    setLoading(false);
  };

  return (
    <Box style={{ width: "100%" }}>
      {!finished && (
        <>
          <Paragraph
            style={{ textAlign: "center", fontSize: "16px", marginBottom: "0" }}
          >
            Click <b>Recover</b> to complete recovering
          </Paragraph>
          <Paragraph style={{ textAlign: "center", fontSize: "12px" }}>
            {old_pk.toBase58()}
          </Paragraph>
          {!loading && (
            <Button type="primary" onClick={onRecover}>
              Recover
            </Button>
          )}
          {loading && (
            <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />
          )}
        </>
      )}
      {finished && (
        <>
          {succeeded && (
            <Result
              status="success"
              title="Successfully Recovered!"
              subTitle="Start using your new wallet now"
            />
          )}
          {!succeeded && (
            <Result
              status="error"
              title="Recovery Failed"
              subTitle="Please check the error logs below"
            >
              <div className="desc" style={{ textAlign: "center" }}>
                <Text type="danger">{msg}</Text>
              </div>
            </Result>
          )}
        </>
      )}
    </Box>
  );
};

export default RecoverBox;
