import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { Form, Input, Button } from "antd";
import { useGlobalState } from "../context";
import { LoadingOutlined } from "@ant-design/icons";
import styled from "styled-components";
import Axios from "axios";

// Import Bip39 to convert a phrase to a seed:
import * as Bip39 from "bip39";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  NONCE_ACCOUNT_LENGTH,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import UrlBox from "../components/UrlBox";
import bs58 from "bs58";
import BN from "bn.js";
import base58 from "bs58";

const executor_sk = new Uint8Array([
  213, 232, 40, 111, 241, 184, 226, 226, 140, 20, 21, 24, 109, 22, 99, 150, 135,
  70, 81, 93, 51, 11, 229, 255, 142, 32, 124, 39, 164, 83, 1, 242, 133, 233,
  209, 254, 108, 33, 240, 70, 39, 51, 103, 167, 195, 205, 112, 102, 121, 93,
  187, 139, 89, 188, 119, 231, 112, 210, 22, 170, 44, 115, 231, 193,
]);

const newFeePayer_sk = new Uint8Array([
  191, 38, 93, 45, 73, 213, 241, 159, 67, 49, 58, 219, 132, 182, 21, 198, 48,
  204, 192, 238, 111, 80, 47, 255, 254, 127, 191, 11, 226, 137, 91, 174, 211,
  115, 44, 26, 220, 41, 19, 221, 16, 251, 226, 133, 54, 204, 193, 213, 152, 234,
  128, 173, 218, 186, 113, 129, 9, 33, 209, 240, 178, 233, 214, 240,
]);

const GenerateRecover: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);
  const { recoverPk, setRecoverPk } = useGlobalState();
  const [form] = Form.useForm();
  const router = useRouter();

  const { account, setAccount, programId } = useGlobalState();

  /*
    When "Generate" is clicked
      - Enter recovery mode, initalize new keypair, executor and nonceAccount
      - Initialize recoveryWallet transaction and store it in DB
  */
  const handleGenerate = async (values: any) => {
    setLoading(true);
    const pk = new PublicKey(values.pk);
    setRecoverPk(pk);

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const newFeePayer = new Keypair();
    const executor = new Keypair();
    const nonceAccount = new Keypair();
    const default_pk = new Keypair().publicKey;
    const programId = new PublicKey(
      "2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"
    );

    console.log("new pk: ", newFeePayer.publicKey.toBase58());
    console.log("nonce pk: ", nonceAccount.publicKey.toBase58());

    console.log("Requesting Airdrop of 1 SOL to newFeePayer...");
    const signature = await connection.requestAirdrop(
      newFeePayer.publicKey,
      1e9
    );
    await connection.confirmTransaction(signature, "finalized");
    console.log("Airdrop received");

    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), pk.toBuffer()],
      programId ?? default_pk
    );
    const new_profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), newFeePayer.publicKey.toBuffer()],
      programId ?? default_pk
    );

    // "BvxqrkebkExVvDRfJHogQGcKfvKWuL2P5ErjDVxjdS9N"
    // "EmrYqBHvhmvRpy6ZVwVe212rdxZAZZacVTVFG5QbD9UN"

    // Fetching all guardians from PDA
    const pda_account = await connection.getAccountInfo(profile_pda[0]);
    const pda_data = pda_account?.data ?? new Buffer("");
    console.log("PDA Data: ", pda_data)
    const guardian_len = new BN(pda_data.subarray(33, 37), "le").toNumber();
    console.log("guardian length: ", guardian_len)
    console.log("All Guardians:")
    let guardians = []
    for(var i = 0; i < guardian_len; i++) {
        let guard = new PublicKey(base58.encode(pda_data.subarray(37+32*i, 37+32*(i+1))))
        console.log(`guard ${i+1}: `, guard.toBase58())
        guardians.push(guard)
    }

    // Transaction 1: setup nonce
    let tx = new Transaction();
    tx.add(
      // create nonce account linked to new FeePayer
      SystemProgram.createAccount({
        fromPubkey: newFeePayer.publicKey,
        newAccountPubkey: nonceAccount.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(
          NONCE_ACCOUNT_LENGTH
        ),
        space: NONCE_ACCOUNT_LENGTH,
        programId: SystemProgram.programId,
      }),
      // init nonce account
      SystemProgram.nonceInitialize({
        noncePubkey: nonceAccount.publicKey, // nonce account pubkey
        authorizedPubkey: newFeePayer.publicKey, // nonce account auth
      })
    );
    (tx.feePayer = newFeePayer.publicKey),
      console.log("Sending nonce transaction...");
    let txid = await sendAndConfirmTransaction(
      connection,
      tx,
      [newFeePayer, nonceAccount],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet\n`);

    /*
    // create nonce entry in DB
    console.log("creating nonce entry in DB...");
    await Axios.post("http://localhost:5000/api/createNonce", {
      pk: newFeePayer.publicKey,
      nonce_pk: nonceAccount.publicKey,
    }).then((res) => {
      console.log(res);
    });
    console.log("nonce entry in DB created");
    */

    // Transaction 2: recover wallet
    const idx1 = Buffer.from(new Uint8Array([5]));
    const new_acct_len = Buffer.from(
      new Uint8Array(new BN(0).toArray("le", 1))
    );

    // populate guardian keys and populate them into the transaction
    let guard_keys = []
    for (var i = 0; i < guardian_len; i++) {
      guard_keys.push({
        pubkey: guardians[i],
        isSigner: true,
        isWritable: false
      })
    }

    const recoverWalletIx = new TransactionInstruction({
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
          pubkey: pk,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: newFeePayer.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: executor.publicKey,
          isSigner: false,
          isWritable: false,
        },
        ...guard_keys
      ],
      programId: programId ?? default_pk,
      data: Buffer.concat([idx1, new_acct_len]),
    });

    /*
    const getNonceRes = await Axios.get(
      "http://localhost:5000/api/nonce/getFromPk/" + pk
    );
    const noncePk = new PublicKey(getNonceRes.data[0].nonce_pk);
    console.log("nonce pk: ", noncePk.toBase58());
    let nonceAccountData = await connection.getNonce(noncePk, "confirmed");
    console.log("nonceAccountData: ", nonceAccountData);
      */

    let nonceAccountData = await connection.getNonce(
      nonceAccount.publicKey,
      "confirmed"
    );

    // initialize guardian signature
    let guard_sigs = []
    for (var i = 0; i < guardian_len; i++) {
      guard_sigs.push({
        publicKey: guardians[i],
        signature: null
      })
    }

    console.log("Creating recoverWallet transaction...");
    tx = new Transaction();
    tx.feePayer = newFeePayer.publicKey;
    tx.recentBlockhash = nonceAccountData?.nonce;
    tx.signatures = guard_sigs;
    tx.add(
      SystemProgram.nonceAdvance({
        noncePubkey: nonceAccount.publicKey,
        authorizedPubkey: newFeePayer.publicKey,
      })
    );
    tx.add(recoverWalletIx);
    console.log("Signing...");
    tx.partialSign(newFeePayer);

    const serializedTx = tx.serialize({
      requireAllSignatures: false,
    });
    const txBased64 = serializedTx.toString("base64");
    let transaction = Transaction.from(Buffer.from(txBased64, "base64"));
    console.log("Signed. Transaction created");

    console.log("Transaction signatures: ");
    for (var i = 0; i < transaction.signatures.length; i++) {
      console.log(
        `pk ${i}: ${transaction.signatures[
          i
        ].publicKey.toBase58()} \nsignature ${i}: `,
        transaction.signatures[i].signature?.toString("base64")
      );
    }

    console.log("Creating transaction entry in DB...");
    await Axios.post("http://localhost:5000/api/create", {
      pk: pk,
      new_pk: newFeePayer.publicKey,
      sig_remain: 2,
      transaction: txBased64,
      executor: bs58.encode(executor.secretKey),
    }).then((res) => {
      console.log(res);
    });
    console.log("DB entry created for transaction entry");
    
    setGenerated(true);
    setLoading(false);

  };

  useEffect(() => {
    if (account) {
      router.push("/wallet");
    }
  }, [account, router]);

  return (
    <>
      <h1 className={"title"}>Recover Wallet with Guardians</h1>

      {!generated && (
        <p>Enter your wallet public key to get a unique recovery link</p>
      )}
      {generated && (
        <p>
          Copy the link and send it to your guardians for them to sign the
          recovery
        </p>
      )}

      {!generated && (
        <StyledForm
          form={form}
          layout="vertical"
          autoComplete="off"
          requiredMark={false}
          onFinish={handleGenerate}
        >
          <div style={{ overflow: "hidden" }}>
            <Form.Item
              name="pk"
              label="Public Key"
              rules={[
                {
                  required: true,
                  message: "Please enter your public key",
                },
                {
                  validator(_, value) {
                    // if (value.length === 44) {
                    //   return Promise.resolve();
                    // }
                    if (true) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Invalid public key"));
                  },
                },
              ]}
            >
              <Input placeholder="" style={{ minWidth: "500px" }} />
            </Form.Item>
          </div>

          {!loading && (
            <Form.Item shouldUpdate className="submit">
              {() => (
                <Button
                  htmlType="submit"
                  disabled={
                    !form.isFieldsTouched(true) ||
                    form.getFieldsError().filter(({ errors }) => errors.length)
                      .length > 0
                  }
                >
                  Generate
                </Button>
              )}
            </Form.Item>
          )}

          {loading && <LoadingOutlined style={{ fontSize: 24 }} spin />}
        </StyledForm>
      )}

      {generated && (
        <UrlBox url={`http://localhost:3000/recover/${recoverPk}`}></UrlBox>
      )}
    </>
  );
};

const StyledForm = styled(Form)`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export default GenerateRecover;
