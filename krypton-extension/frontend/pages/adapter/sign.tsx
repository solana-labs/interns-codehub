/*global chrome*/
import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button } from "antd";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { getAccountFromPkString } from "../../utils";
import { useGlobalModalContext } from "../../components/GlobalModal";
import { Signer } from "../../types/account";
import { WALLET_PROGRAM_ID } from "../../utils/constants";

const Sign: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [id, setId] = useState<number>(0);
  const [pk, setPk] = useState<PublicKey>(PublicKey.default);

  const modalContext = useGlobalModalContext();

  useEffect(() => {
    chrome.storage.local.get(["searchParams", "pk"]).then(async (result) => {
      if (result.searchParams == undefined || result.pk == undefined) {
        return;
      }
      const search = result.searchParams;
      const origin = search.origin;
      const request = JSON.parse(search.request);
      console.log("request: ", request);

      const data = new Uint8Array(Object.keys(request.params.data).length);
      for (const index in request.params.data) {
        data[Number(index)] = request.params.data[index];
      }
      console.log("data: ", data);

      const msg = new TextDecoder("utf8").decode(data);
      console.log("msg: ", msg);

      setMsg(msg);
      setPk(new PublicKey(result.pk));
      setId(request.id);
      setOrigin(origin);
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
    const signer = (await getAccountFromPkString(
      pk.toBase58(),
      modalContext
    )) as Signer;
    const data = new TextEncoder().encode(msg);
    const sig = bs58.encode(await signer.signMessage(data));
    const pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), pk.toBuffer()],
      WALLET_PROGRAM_ID
    );

    postMessage({
      method: "sign",
      result: {
        signature: sig,
        publicKey: pk,
        pda: pda,
      },
      id: id,
    });
    setTimeout(() => window.close(), 100);
  };

  return (
    <>
      <h1 className={"title"}>Sign Message</h1>
      <p>{origin}</p>
      <p style={{ marginTop: "20px", textAlign: "left", width: "75%" }}>
        message:
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
        {msg}
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

export default Sign;
