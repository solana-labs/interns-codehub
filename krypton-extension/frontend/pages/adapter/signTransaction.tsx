/*global chrome*/
import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, message } from "antd";
import bs58 from "bs58";

import {
  AccountMeta,
  Cluster,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useGlobalModalContext } from "../../components/GlobalModal";
import {
  getAccountFromPkString,
  JSONtoUInt8Array,
  parsePubkey,
} from "../../utils";
import { Signer } from "../../types/account";
import { RPC_URL, WALLET_PROGRAM_ID } from "../../utils/constants";
import { useGlobalState } from "../../context";
import BN from "bn.js";

const SignTransaction: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>("");
  const [id, setId] = useState<number>(0);
  const [payload, setPayload] = useState<Uint8Array>(new Uint8Array());
  const [pk, setPk] = useState<PublicKey>(PublicKey.default);
  const [txMessage, setTxMessage] = useState<VersionedMessage>();
  const [txSignatures, setTxSignatures] = useState<Uint8Array[]>([]);
  const [network, setNetwork] = useState<Cluster>("mainnet-beta");

  const modalContext = useGlobalModalContext();

  useEffect(() => {
    chrome.storage.local
      .get(["searchParams", "pk", "network"])
      .then(async (result) => {
        if (result.searchParams == undefined || result.pk == undefined) {
          return;
        }
        const search = result.searchParams;
        const origin = search.origin;
        const request = JSON.parse(search.request);
        console.log("request: ", request);
        const transaction = request.params.transaction;
        console.log("retrieved TX: ", transaction);
        const message = request.params.transaction.message;
        const raw_signatures = request.params.transaction.signatures;
        console.log("retrieved signatures: ", raw_signatures);
        const signatures: Uint8Array[] = [];
        for (const sig of raw_signatures) {
          const uint8Sig = JSONtoUInt8Array(sig);
          signatures.push(uint8Sig);
        }
        const payload = bs58.decode(request.params.message);
        const pk = new PublicKey(result.pk);
        const pk_bytes = pk.toBytes();
        for (let i = 4; i < 36; i++) {
          payload[i] = pk_bytes[i - 4];
        }

        setTxMessage(message);
        setTxSignatures(signatures);
        setPayload(payload);
        setPk(pk);
        setId(request.id);
        setOrigin(origin);
        setNetwork(result.network);
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
    const pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), pk.toBuffer()],
      WALLET_PROGRAM_ID
    );
    console.log("network: ", network);
    const connection = new Connection(RPC_URL(network), "confirmed");

    console.log("retrieved tx message: ", txMessage);

    const all_accounts_bs58 = [];
    const allAccounts = (txMessage! as any).accountKeys;
    for (let i = 0; i < allAccounts.length; i++) {
      allAccounts[i] = parsePubkey(allAccounts[i]);
    }
    for (const acct of allAccounts) {
      all_accounts_bs58.push(acct.toBase58());
    }
    console.log("ALL accounts BEFORE: ", all_accounts_bs58);
    const numTotalAccounts = allAccounts.length;
    const {
      numRequiredSignatures,
      numReadonlySignedAccounts,
      numReadonlyUnsignedAccounts,
    } = txMessage!.header;
    const numReadWriteUnsignedAccounts =
      numTotalAccounts - numRequiredSignatures - numReadonlyUnsignedAccounts;

    const idxReadWriteSignedAccounts =
      numRequiredSignatures - numReadonlySignedAccounts;
    const idxReadonlySignedAccounts =
      idxReadWriteSignedAccounts + numReadonlySignedAccounts;
    const idxReadWriteUnsignedAccounts =
      idxReadonlySignedAccounts + numReadWriteUnsignedAccounts;
    const idxReadonlyUnsignedAccounts =
      idxReadWriteUnsignedAccounts + numReadonlyUnsignedAccounts;

    const signerWritable = new Set(
      allAccounts.slice(0, idxReadWriteSignedAccounts)
    );
    const signerReadable = new Set(
      allAccounts.slice(idxReadWriteSignedAccounts, idxReadonlySignedAccounts)
    );
    const notSignerWritable = new Set(
      allAccounts.slice(idxReadonlySignedAccounts, idxReadWriteUnsignedAccounts)
    );
    const notSignerReadable = new Set(
      allAccounts.slice(idxReadWriteUnsignedAccounts, numTotalAccounts)
    );

    const allInstructions: TransactionInstruction[] = [];

    // wrap CPI and invoke sign CPI
    for (const instruction of (txMessage! as any).instructions) {
      console.log("=========== INSTRUCTION ==========");
      console.log("Original Instruction: ", instruction);
      const idx = Buffer.from(new Uint8Array([8]));
      const customProgramId: any = allAccounts[instruction.programIdIndex];
      console.log("program id: ", customProgramId);
      console.log("program id base58: ", customProgramId.toBase58());
      console.log("data: ", instruction.data);

      const acct_len = new BN(instruction.accounts.length).toArrayLike(
        Buffer,
        "le",
        1
      );
      const dataBuf = Buffer.from(bs58.decode(instruction.data));
      const data_len = new BN(dataBuf.length).toArrayLike(Buffer, "le", 4);

      const messageKeys: AccountMeta[] = [];
      for (const acctIndex of instruction.accounts) {
        const accountPubkey = allAccounts[acctIndex];
        if (accountPubkey.toBase58() === pda[0].toBase58()) {
          messageKeys.push({
            pubkey: accountPubkey,
            isSigner: false,
            isWritable: true,
          });
          continue;
        }
        if (signerWritable.has(allAccounts[acctIndex])) {
          messageKeys.push({
            pubkey: accountPubkey,
            isSigner: true,
            isWritable: true,
          });
        } else if (signerReadable.has(allAccounts[acctIndex])) {
          messageKeys.push({
            pubkey: accountPubkey,
            isSigner: true,
            isWritable: false,
          });
        } else if (notSignerWritable.has(allAccounts[acctIndex])) {
          messageKeys.push({
            pubkey: accountPubkey,
            isSigner: false,
            isWritable: true,
          });
        } else if (notSignerReadable.has(allAccounts[acctIndex])) {
          messageKeys.push({
            pubkey: accountPubkey,
            isSigner: false,
            isWritable: false,
          });
        }
      }
      console.log("account META: ", messageKeys);

      const wrapSignIx = new TransactionInstruction({
        keys: [
          {
            pubkey: pda[0],
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: pk,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: customProgramId,
            isSigner: false,
            isWritable: false,
          },
          ...messageKeys,
        ],
        programId: WALLET_PROGRAM_ID,
        data: Buffer.concat([idx, acct_len, data_len, dataBuf]),
      });

      console.log("wrapSign Instruction: ", wrapSignIx);
      allInstructions.push(wrapSignIx);
    }
    console.log("========================");

    const recentBlockhash = await connection.getLatestBlockhash();
    const messageLegacy = new TransactionMessage({
      payerKey: pk,
      recentBlockhash: recentBlockhash.blockhash,
      instructions: allInstructions,
    }).compileToLegacyMessage();
    const wrapSignTx = new VersionedTransaction(messageLegacy);
    wrapSignTx.signatures = txSignatures;

    let transactionBuffer;
    if (typeof (wrapSignTx as any).serializeMessage === "function") {
      transactionBuffer = (wrapSignTx as any).serializeMessage();
    } else {
      transactionBuffer = (wrapSignTx as any).message.serialize();
    }
    const sig = await signer.signMessage(transactionBuffer);
    console.log("signTransaction sig: ", sig);
    console.log("signTransaction sig bs58: ", bs58.encode(sig));
    wrapSignTx.addSignature(pk, sig);
    console.log("wrapSign TX: ", wrapSignTx);
    console.log("wrapSign Tx Message: ", wrapSignTx.message);
    console.log(
      "wrapSign TX feepayer: ",
      wrapSignTx.message.staticAccountKeys[0].toBase58()
    );
    const all_accts_after = [];
    for (const acct of wrapSignTx.message.staticAccountKeys) {
      all_accts_after.push(acct.toBase58());
    }
    console.log("ALL accounts AFTER: ", all_accts_after);

    const simulationRes = await connection.simulateTransaction(wrapSignTx);
    console.log("TX simulation RES: ", simulationRes);

    // const txid = await connection.sendTransaction(wrapSignTx);
    // console.log("TX id: ", txid);

    postMessage({
      method: "signTransaction",
      result: {
        signature: sig,
        publicKey: pk,
        pda: pda[0],
        transaction: wrapSignTx,
        message: wrapSignTx.message.serialize(),
      },
      id: id,
    });
    setTimeout(() => window.close(), 100);
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

export default SignTransaction;
