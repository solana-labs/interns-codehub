import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Form, Input, Button, Alert } from "antd";
import { useGlobalState } from "../context";
import { LoadingOutlined } from "@ant-design/icons";
import Axios from "axios";
import useInterval from "@use-it/interval";
import {
  AccountMeta,
  Connection,
  Keypair,
  NONCE_ACCOUNT_LENGTH,
  PublicKey,
  SignaturePubkeyPair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import UrlBox from "../components/UrlBox";
import BN from "bn.js";
import base58 from "bs58";
import RecoverBox from "../components/RecoverBox";
import { StyledForm } from "../styles/StyledComponents.styles";
import {
  getProfilePDA,
  partialSign,
  sendAndConfirmTransactionWithAccount,
} from "../utils";
import { KeypairSigner } from "../types/account";
import { RPC_URL, WALLET_PROGRAM_ID } from "../utils/constants";

const GenerateRecover: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);
  const [allSigned, setAllSigned] = useState<boolean>(false);
  const [canGenerate, setCanGenerate] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");
  const { recoverPk, setRecoverPk } = useGlobalState();
  const [form] = Form.useForm();

  const { account, network } = useGlobalState();

  useInterval(async () => {
    if (!account) {
      return;
    }
    const res = await Axios.get(
      "http://localhost:5000/api/getFromNewPk/" + account.pk
    );
    const res_data = res.data[0];
    if (res_data == undefined) {
      return;
    }
    setRecoverPk(new PublicKey(res_data.pk));
    if (res_data.sig_remain === 0) {
      setAllSigned(true);
    }
  }, 2000);

  /*
    When "Generate" is clicked
      - Enter recovery mode, initalize new keypair and nonceAccount
      - Initialize recoveryWallet transaction and store it in DB
  */
  const handleGenerate = async (values: any) => {
    if (!account) {
      return;
    }

    const pk = new PublicKey(values.pk);
    const res = await Axios.get(
      "http://localhost:5000/api/getFromPk/" + pk.toBase58()
    );
    const res_data = res.data[0];
    if (res_data !== undefined && res_data["pk"] === pk.toBase58()) {
      setCanGenerate(false);
      setErr(
        "Duplicate recovery request! Please enter a different public key to recover"
      );
      return;
    }

    console.log("=====GENERATING======");
    setLoading(true);
    setRecoverPk(pk);

    const connection = new Connection(RPC_URL(network), "confirmed");
    const newFeePayer = account;
    const newPublicKey = await newFeePayer.getPublicKey();
    const nonceAccount = new Keypair();

    console.log("curr new pk: ", newPublicKey.toBase58());
    console.log("nonce pk: ", nonceAccount.publicKey.toBase58());

    const profile_pda = getProfilePDA(pk);
    const new_profile_pda = getProfilePDA(newPublicKey);

    // "BvxqrkebkExVvDRfJHogQGcKfvKWuL2P5ErjDVxjdS9N"
    // "EmrYqBHvhmvRpy6ZVwVe212rdxZAZZacVTVFG5QbD9UN"

    // Fetching all guardians & recovery threshold from PDA
    const pda_account = await connection.getAccountInfo(profile_pda[0]);
    const pda_data = pda_account?.data ?? Buffer.from("");
    console.log("PDA Data: ", pda_data);
    const thres = new BN(pda_data.subarray(0, 1), "le").toNumber();
    const guardian_len = new BN(pda_data.subarray(1, 5), "le").toNumber();
    console.log("guardian length: ", guardian_len);
    console.log("All Guardians:");
    const guardians: PublicKey[] = [];
    for (let i = 0; i < guardian_len; i++) {
      const guard = new PublicKey(
        base58.encode(pda_data.subarray(5 + 32 * i, 5 + 32 * (i + 1)))
      );
      console.log(`guard ${i + 1}: `, guard.toBase58());
      guardians.push(guard);
    }

    // Transaction 1: setup nonce
    const recentBlockhash = await connection.getLatestBlockhash();
    // TODO: Check if Yubikey is connected
    let tx = new Transaction({
      feePayer: await account.getPublicKey(),
      ...recentBlockhash,
    });
    tx.add(
      // create nonce account linked to new FeePayer
      SystemProgram.createAccount({
        fromPubkey: newPublicKey,
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
        authorizedPubkey: newPublicKey, // nonce account auth
      })
    );
    (tx.feePayer = newPublicKey), console.log("Sending nonce transaction...");
    const txid = await sendAndConfirmTransactionWithAccount(
      connection,
      tx,
      [newFeePayer, new KeypairSigner(nonceAccount)],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=${network}\n`);

    // Transaction 2: recover wallet
    const idx1 = Buffer.from(new Uint8Array([5]));
    const new_acct_len = Buffer.from(
      new Uint8Array(new BN(0).toArray("le", 1))
    );

    // populate guardian keys and populate them into the transaction
    const guard_keys: AccountMeta[] = [];
    for (let i = 0; i < guardian_len; i++) {
      guard_keys.push({
        pubkey: guardians[i],
        isSigner: true,
        isWritable: false,
      });
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
          pubkey: newPublicKey,
          isSigner: true,
          isWritable: true,
        },
        ...guard_keys,
      ],
      programId: WALLET_PROGRAM_ID,
      data: Buffer.concat([idx1, new_acct_len]),
    });

    const nonceAccountData = await connection.getNonce(
      nonceAccount.publicKey,
      "confirmed"
    );

    // initialize guardian signature
    const guard_sigs: SignaturePubkeyPair[] = [];
    for (let i = 0; i < guardian_len; i++) {
      guard_sigs.push({
        publicKey: guardians[i],
        signature: null,
      });
    }

    console.log("Creating recoverWallet transaction...");
    tx = new Transaction();
    tx.feePayer = newPublicKey;
    tx.recentBlockhash = nonceAccountData?.nonce;
    tx.signatures = guard_sigs;
    tx.add(
      SystemProgram.nonceAdvance({
        noncePubkey: nonceAccount.publicKey,
        authorizedPubkey: newPublicKey,
      })
    );
    tx.add(recoverWalletIx);
    console.log("Signing...");
    //tx.partialSign(newFeePayer);
    await partialSign(tx, newFeePayer);

    const serializedTx = tx.serialize({
      requireAllSignatures: false,
    });
    const txBased64 = serializedTx.toString("base64");
    console.log("TX base 64: ", txBased64);
    const transaction = Transaction.from(Buffer.from(txBased64, "base64"));
    console.log("Signed. Transaction created");

    console.log("Transaction signatures: ");
    for (let i = 0; i < transaction.signatures.length; i++) {
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
      new_pk: newPublicKey,
      sig_remain: thres,
      transaction: txBased64,
    }).then((res) => {
      console.log(res);
    });
    console.log("DB entry created for transaction entry");

    setGenerated(true);
    setLoading(false);
  };

  return (
    <>
      <h1 className={"title"}>Recover Wallet with Guardians</h1>

      {!allSigned && (
        <>
          {!generated && (
            <>
              <p>Enter your old public key to get a unique recovery link</p>
              {!canGenerate && <Alert message={err} type="error" />}
            </>
          )}
          {generated && (
            <p style={{ textAlign: "center" }}>
              Copy the following link and send it to your guardians for them to
              sign the recovery
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
                  rules={[
                    {
                      required: true,
                      message: "Please enter your public key",
                    },
                    {
                      validator(_, value) {
                        if (PublicKey.isOnCurve(value)) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Invalid public key"));
                      },
                    },
                  ]}
                >
                  <Input
                    placeholder="Public Key"
                    style={{
                      minWidth: "300px",
                      backgroundColor: "rgb(34, 34, 34)",
                      color: "#d3d3d3",
                      border: "1px solid #d3d3d3",
                    }}
                  />
                </Form.Item>
              </div>

              {!loading && (
                <Form.Item shouldUpdate className="submit">
                  {() => (
                    <Button
                      htmlType="submit"
                      type="primary"
                      disabled={
                        !form.isFieldsTouched(true) ||
                        form
                          .getFieldsError()
                          .filter(({ errors }) => errors.length).length > 0
                      }
                    >
                      Generate
                    </Button>
                  )}
                </Form.Item>
              )}

              {loading && (
                <LoadingOutlined
                  style={{ fontSize: 24, color: "#fff", marginTop: "36px" }}
                  spin
                />
              )}
            </StyledForm>
          )}

          {generated && (
            <UrlBox url={`http://localhost:3000/recover/${recoverPk}`}></UrlBox>
          )}
        </>
      )}

      {allSigned && recoverPk && <RecoverBox old_pk={recoverPk} />}
    </>
  );
};

export default GenerateRecover;
