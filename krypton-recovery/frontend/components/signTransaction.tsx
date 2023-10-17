import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LoadingOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Transaction } from "@solana/web3.js";
import { Button, Result } from "antd";
import bs58 from "bs58";
import { FC, Props, useContext, useEffect, useState } from "react";
import React, { useCallback } from "react";
import Axios from "axios";
import { useGlobalState } from "../context";
import { Typography } from 'antd';

const { Text } = Typography;

export const SignTransaction: FC<{ pk: string | string[] | undefined }> = (
  pk_obj
) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState<boolean>(false);
  const { finished, setFinished } = useGlobalState()
  const [succeeded, setSucceeded] = useState<boolean>(false);
  const [msg, setMsg] = useState<any>("");

  useEffect(() => {
    console.log("changed msg: ", msg)
  }, [msg])

  const onClick = useCallback(async () => {
    try {
      setLoading(true);
      if (!publicKey) throw new Error("Wallet not connected!");
      if (!signTransaction)
        throw new Error("Wallet does not support transaction signing!");

      const pk = pk_obj.pk;
      console.log("PK to recover: ", pk);

      const res = await Axios.get("http://localhost:5000/api/getFromPk/" + pk);
      const res_data = res.data[0];
      if (res_data == undefined) {
        throw new Error("Invalid signing request!");
      }
      console.log("PK new: ", res_data.new_pk);

      let transactionBased64 = res_data.transaction;
      let transaction = Transaction.from(
        Buffer.from(transactionBased64, "base64")
      );
      let sig_changed = false;
      console.log("OLD SIGNATURES");
      for (var i = 0; i < transaction.signatures.length; i++) {
        console.log(
          `pk ${i}: ${transaction.signatures[
            i
          ].publicKey.toBase58()} \nsignature ${i}: `,
          bs58.encode(transaction.signatures[i].signature ?? [])
        );
      }

      const old_signatures = structuredClone(transaction.signatures);
      console.log("Signing to recover...");
      transaction = await signTransaction(transaction);

      console.log("NEW SIGNATURES");
      for (var i = 0; i < transaction.signatures.length; i++) {
        console.log(
          `pk ${i}: ${transaction.signatures[
            i
          ].publicKey.toBase58()} \nsignature ${i}: `,
          bs58.encode(transaction.signatures[i].signature ?? [])
        );
        if(bs58.encode(transaction.signatures[i].signature ?? []) != bs58.encode(old_signatures[i].signature ?? [])) {
          sig_changed = true;
        }
      }

      // If no signature changed, it means that we have a duplicate signature
      if(!sig_changed) {
        throw new Error("Duplicate signing");
      }

      // If signature threshold is reached, then we can verify the signatures &
      // transfer+close
      if (res_data.sig_remain == 1) {
        console.log("THRES REACHED");
      }
      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
      });
      const txBased64 = serializedTx.toString("base64");
      await Axios.post("http://localhost:5000/api/update", {
        pk: pk,
        new_transaction: txBased64,
      }).then((res) => {
        console.log(res);
      });
      setSucceeded(true);
    } catch (err: any) {
      setSucceeded(false);
      setMsg(err.toString());
      console.error(err);
    }
    setFinished(true);
    setLoading(false);
  }, [publicKey, signTransaction, connection]);

  return (
    <>
      {!loading && !finished && (
        <Button onClick={onClick}>Sign Transaction</Button>
      )}
      {loading && !finished && <LoadingOutlined style={{ fontSize: 24 }} spin />}
      {finished && succeeded && (
        <Result
          status="success"
          title="Successfully Signed!"
          subTitle="Notify your guardians that you have signed"
        />
      )}
      {finished && !succeeded && (
        <Result
          status="error"
          title="Signing Failed"
          subTitle="Please check if you are recovering the correct wallet"
          extra={[<Button onClick={onClick}>Sign Again</Button>]}
        >
          <div className="desc" style={{textAlign: "center"}}>
            <Text type="danger">{msg}</Text>
          </div>
        </Result>
      )}
    </>
  );
};
