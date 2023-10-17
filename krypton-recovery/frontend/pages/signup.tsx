import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Alert, Popconfirm, Form, Input, Radio } from "antd";
import PhraseBox from "../components/UrlBox";
import { useGlobalState } from "../context";
import { LoadingOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";
import Axios from "axios";

// Import Bip39 to generate a phrase and convert it to a seed:
import * as Bip39 from "bip39";
import {
  Connection,
  Keypair,
  NONCE_ACCOUNT_LENGTH,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import Paragraph from "antd/lib/skeleton/Paragraph";
import { Box } from "../styles/StyledComponents.styles";
import form from "antd/lib/form";

import {
  getOrCreateAssociatedTokenAccount,
  AccountLayout,
  TOKEN_PROGRAM_ID,
  createSyncNativeInstruction,
  mintTo,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";

const BN = require("bn.js");

const guard1_sk = new Uint8Array([
  219, 192, 245, 18, 33, 148, 209, 236, 79, 88, 130, 250, 118, 164, 109, 172,
  44, 165, 195, 136, 163, 187, 142, 184, 86, 208, 221, 3, 162, 127, 89, 82, 164,
  161, 91, 84, 42, 199, 40, 204, 137, 172, 179, 152, 212, 17, 58, 31, 149, 133,
  67, 96, 23, 111, 83, 3, 119, 19, 37, 234, 163, 216, 53, 177,
]);

const guard2_sk = new Uint8Array([
  16, 5, 214, 175, 105, 238, 18, 14, 125, 4, 242, 215, 158, 179, 200, 230, 230,
  16, 36, 227, 200, 142, 130, 53, 235, 159, 100, 69, 177, 36, 239, 113, 42, 210,
  117, 85, 113, 159, 206, 119, 128, 70, 103, 49, 182, 66, 56, 157, 83, 23, 35,
  230, 206, 33, 216, 246, 225, 4, 210, 157, 161, 122, 142, 66,
]);

const guard3_sk = new Uint8Array([
  94, 98, 75, 17, 140, 107, 60, 66, 202, 114, 237, 8, 118, 129, 7, 68, 173, 6,
  106, 131, 118, 72, 208, 174, 113, 231, 127, 154, 50, 191, 223, 209, 194, 4,
  95, 55, 179, 216, 90, 90, 229, 27, 131, 112, 116, 110, 129, 176, 218, 139,
  146, 221, 75, 148, 197, 54, 113, 159, 226, 239, 52, 43, 19, 81,
]);

const feePayer_sk = new Uint8Array([
  224, 131, 102, 17, 253, 180, 120, 225, 108, 185, 213, 41, 80, 21, 207, 1, 78,
  99, 180, 118, 25, 132, 107, 110, 26, 127, 14, 233, 17, 223, 177, 54, 101, 47,
  4, 56, 92, 104, 178, 192, 225, 215, 164, 204, 220, 140, 10, 105, 204, 170, 96,
  130, 117, 57, 231, 233, 104, 23, 140, 129, 15, 25, 53, 178,
]);

const mintAuthority_sk = new Uint8Array([
  241, 145, 177, 126, 244, 190, 248, 188, 151, 50, 224, 196, 43, 153, 22, 94,
  67, 183, 97, 245, 201, 103, 103, 109, 45, 164, 181, 109, 138, 152, 137, 101,
  163, 141, 201, 165, 214, 152, 171, 237, 175, 1, 228, 183, 81, 244, 27, 10,
  157, 38, 80, 90, 173, 131, 130, 132, 188, 250, 138, 16, 12, 217, 109, 213,
]);

const customMint = new PublicKey(
  "9mMtr7Rx8ajjpRbHmUzb5gjgBLqNtPABdkNiUBAkTrmR"
);

const SOL_MINT = "So11111111111111111111111111111111111111112";
const sol_pk = new PublicKey(SOL_MINT);

const program_id = new PublicKey(
  "2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"
);

const Signup: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const { setAccount, account, setPDA, pda, programId, setProgramId } =
    useGlobalState();

  const router = useRouter();
  const [form] = Form.useForm();

  const mintAuthority = Keypair.fromSecretKey(mintAuthority_sk);

  useEffect(() => {
    // const guard1 = Keypair.fromSecretKey(guard1_sk);
    // const guard2 = Keypair.fromSecretKey(guard2_sk);
    // const guard3 = Keypair.fromSecretKey(guard3_sk);
    // const feePayer = Keypair.fromSecretKey(feePayer_sk);

    const feePayer = new Keypair();
    //const feePayer = Keypair.fromSecretKey(feePayer_sk);
    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), feePayer.publicKey.toBuffer()],
      program_id ?? new Keypair().publicKey
    );

    setProgramId(program_id);
    setAccount(feePayer);
    setPDA(profile_pda[0]);
  }, []);

  const showPopconfirm = () => {
    setVisible(true);
  };

  // const handleOk = () => {
  //   //form.submit();
  //   setLoading(true);
  //   router.push("/wallet");
  // };

  const handleCancel = () => {
    setVisible(false);
  };

  const handleOk = async () => {
    setLoading(true);
    const connection = new Connection("https://api.devnet.solana.com/");

    console.log("pk: ", account?.publicKey.toBase58());
    console.log("program id: ", programId?.toBase58());

    console.log("Requesting Airdrop of 1 SOL...");
    const signature = await connection.requestAirdrop(
      account?.publicKey ?? new Keypair().publicKey,
      1e9
    );
    await connection.confirmTransaction(signature, "finalized");
    console.log("Airdrop received");

    // instr 1: initialize social recovery wallet
    const idx = Buffer.from(new Uint8Array([0]));
    const acct_len = Buffer.from(new Uint8Array(new BN(0).toArray("le", 1)));
    const recovery_threshold = Buffer.from(
      new Uint8Array(new BN(0).toArray("le", 1))
    );

    const initializeSocialWalletIx = new TransactionInstruction({
      keys: [
        {
          pubkey: pda ?? new Keypair().publicKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: account?.publicKey ?? new Keypair().publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: programId ?? new Keypair().publicKey,
      data: Buffer.concat([idx, acct_len, recovery_threshold]),
    });

    console.log("Initializing social wallet...");
    let tx = new Transaction();
    tx.add(initializeSocialWalletIx);

    let txid = await sendAndConfirmTransaction(
      connection,
      tx,
      [account ?? new Keypair()],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet\n`);

    // CREATE TOKEN ACCOUNT & AIRDROP for TESTING!
    // get pda
    const profile_pda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("profile", "utf-8"),
        account?.publicKey.toBuffer() ?? new Buffer(""),
      ],
      program_id
    );
    console.log("PDA: ", profile_pda[0].toBase58());

    // Create Token Account for custom mint
    // console.log("Creating token account for mint...");
    // const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   account ?? new Keypair(),
    //   customMint,
    //   profile_pda[0],
    //   true
    // );
    // console.log(
    //   "token account created: " + senderTokenAccount.address.toBase58() + "\n"
    // );

    console.log("Getting associated token address...");
    const associatedToken = await getAssociatedTokenAddress(
      customMint,
      profile_pda[0],
      true
    );

    console.log("Creating token account for mint...");
    const createTA_tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        account?.publicKey ?? new Keypair().publicKey,
        associatedToken,
        profile_pda[0],
        customMint
      )
    );

    await sendAndConfirmTransaction(connection, createTA_tx, [
      account ?? new Keypair(),
    ]);

    console.log("Getting sender token account...");
    const senderTokenAccount = await getAccount(
      connection,
      associatedToken,
      "confirmed"
    );

    console.log(
      "token account created: " + senderTokenAccount.address.toBase58() + "\n"
    );

    // console.log("Creating token account for native SOL...");
    // const senderSOLTokenAccount = await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   account ?? new Keypair(),
    //   sol_pk,
    //   profile_pda[0],
    //   true
    // );
    // console.log(
    //   "token account created: " +
    //     senderSOLTokenAccount.address.toBase58() +
    //     "\n"
    // );

    // // transfer SOL to sender token account (MINTING)
    // const transferSOLtoSender = SystemProgram.transfer({
    //   fromPubkey: account?.publicKey ?? new Keypair().publicKey,
    //   toPubkey: senderSOLTokenAccount.address,
    //   lamports: 1e8,
    // });

    // tx = new Transaction()
    //   .add(transferSOLtoSender)
    //   .add(createSyncNativeInstruction(senderSOLTokenAccount.address));

    // console.log("Transfer SOL to sender account...");
    // let getSOL_txid = await sendAndConfirmTransaction(
    //   connection,
    //   tx,
    //   [account ?? new Keypair()],
    //   {
    //     skipPreflight: true,
    //     preflightCommitment: "confirmed",
    //     commitment: "confirmed",
    //   }
    // );
    // console.log(
    //   `https://explorer.solana.com/tx/${getSOL_txid}?cluster=devnet\n`
    // );

    // const senderSOLTokenAccountBalance =
    //   await connection.getTokenAccountBalance(senderSOLTokenAccount.address);
    // console.log(
    //   `Sender SOL Token Account Balance: ${senderSOLTokenAccountBalance.value.amount}\n`
    // );

    // Mint to token account (MINTING)
    console.log("Minting to token account...");
    console.log(customMint.toBase58());
    console.log(senderTokenAccount.address.toBase58());
    await mintTo(
      connection,
      account ?? new Keypair(),
      customMint,
      senderTokenAccount.address,
      mintAuthority,
      6e9
      //[],
      //{skipPreflight: true},
    );
    console.log("Minted!\n");

    const senderTokenAccountBalance = await connection.getTokenAccountBalance(
      senderTokenAccount.address
    );
    console.log(
      `Sender Token Account Balance: ${senderTokenAccountBalance.value.amount}\n`
    );

    router.push("/wallet");
  };

  return (
    <>
      <h1 className={"title"}>Account Signup</h1>

      {!loading && <p>Confirm your signup</p>}
      {loading && <p>Confirming your signup...</p>}

      {/* <Form
        form={form}
        layout="vertical"
        name="form_in_modal"
        initialValues={{ modifier: "ff" }}
        onFinish={onFinish}
      >
        <Form.Item
          name="guardian1"
          label="Guardian 1 Public Key"
          rules={[
            {
              required: true,
              message: "Please input the public key of guardian",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="guardian2"
          label="Guardian 2 Public Key"
          rules={[
            {
              required: true,
              message: "Please input the public key of guardian",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="guardian3"
          label="Guardian 3 Public Key"
          rules={[
            {
              required: true,
              message: "Please input the public key of guardian",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
            name="modifier"
            className="collection-create-form_last-form-item"
          >
            <Radio.Group>
              <Radio value="ff">Friend / Family</Radio>
              <Radio value="hardware">Hardware</Radio>
            </Radio.Group>
          </Form.Item>
      </Form> */}

      {!loading && (
        <Popconfirm
          title="Do you confirm your signup"
          visible={visible}
          onConfirm={handleOk}
          okButtonProps={{ loading: loading }}
          onCancel={handleCancel}
          cancelText={"No"}
          okText={"Yes"}
        >
          <Button type="primary" onClick={showPopconfirm}>
            Finish
          </Button>
        </Popconfirm>
      )}

      {loading && <LoadingOutlined style={{ fontSize: 24 }} spin />}
    </>
  );
};

export default Signup;
