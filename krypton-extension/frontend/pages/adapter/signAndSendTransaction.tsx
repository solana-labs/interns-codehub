/*global chrome*/
import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button } from "antd";
import bs58 from "bs58";
import {
  Connection,
  PublicKey,
  VersionedMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useGlobalModalContext } from "../../components/GlobalModal";
import { getAccountFromPkString, partialSign } from "../../utils";
import { useGlobalState } from "../../context";
import { Signer } from "../../types/account";
import { RPC_URL } from "../../utils/constants";

const SignAndSendTransaction: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>("");
  const [id, setId] = useState<number>(0);
  const [pk, setPk] = useState<PublicKey>(PublicKey.default);
  const [payload, setPayload] = useState<Uint8Array>(new Uint8Array());
  const [options, setOptions] = useState<any>();
  const modalContext = useGlobalModalContext();
  const { network } = useGlobalState();

  useEffect(() => {
    chrome.storage.local.get(["searchParams", "pk"]).then(async (result) => {
      if (result.searchParams == undefined || result.pk == undefined) {
        return;
      }
      const search = result.searchParams;
      const origin = search.origin;
      const request = JSON.parse(search.request);
      console.log("request: ", request);
      const payload = bs58.decode(request.params.message);
      console.log("payload: ", payload);
      const options = request.params.network;
      console.log("options: ", options);

      setId(request.id);
      setOrigin(origin);
      setPk(new PublicKey(result.pk));
      setPayload(payload);
      setOptions(options);
    });
  }, []);

  const handleCancel = () => {
    window.close();
  };

  const postMessage = (message: any) => {
    // eslint-disable-next-line no-undef
    chrome.runtime.sendMessage({
      channel: "krypton_extension_background_channel",
      data: message,
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    const connection = new Connection(RPC_URL(network), "confirmed");
    const { blockhash } = await connection.getLatestBlockhash();

    const signer = (await getAccountFromPkString(
      pk.toBase58(),
      modalContext
    )) as Signer;
    const message = VersionedMessage.deserialize(payload);
    message.recentBlockhash = blockhash;
    const transaction = new VersionedTransaction(message);
    await partialSign(transaction, signer);
    console.log("tx signatures: ", transaction.signatures);

    const signature = await connection.sendTransaction(transaction, options);
    console.log("sendTx signature: ", signature);
    // setSig(signature);

    postMessage({
      method: "signAndSendTransaction",
      result: {
        signature: signature,
        publicKey: pk,
      },
      id: id,
    });
    setTimeout(() => window.close(), 300);
  };

  return (
    <>
      <h1 className={"title"}>Approve Transaction</h1>
      <p>{origin}</p>
      <p style={{ marginTop: "20px", textAlign: "left", width: "75%" }}>
        Estimated Changes:
      </p>
      <div
        style={{
          height: "70px",
          backgroundColor: "#2a2a2a",
          width: "75%",
          textAlign: "center",
          justifyContent: "center",
          display: "flex",
          flexDirection: "column",
        }}
      >
        No changes
      </div>

      <div
        style={{
          display: "flex",
          columnGap: "20px",
          justifyContent: "space-between",
          marginTop: "170px",
          alignItems: "flex-end",
          height: "380px",
          position: "absolute",
        }}
      >
        <Button
          type="default"
          shape="default"
          style={{ width: "140px", height: "40px", fontSize: "17px" }}
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button
          htmlType="submit"
          type="primary"
          loading={loading}
          style={{ width: "140px", height: "40px", fontSize: "17px" }}
          onClick={handleSubmit}
        >
          Approve
        </Button>
      </div>
    </>
  );
};

export default SignAndSendTransaction;
