import React, { ReactElement, useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Alert, Popconfirm, Modal, Form, Input, Radio } from "antd";
import PhraseBox from "../components/UrlBox";
import { useGlobalState } from "../context";
import { LoadingOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";

// Import Bip39 to generate a phrase and convert it to a seed:
import * as Bip39 from "bip39";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import GuardianBox from "../components/GuardianBox";
import { createGlobalStyle } from "styled-components";
import form from "antd/lib/form";
// Import the Keypair class from Solana's web3.js library:

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
  106, 239, 158, 103, 197, 210, 91, 64, 112, 50, 190, 210, 69, 58, 113, 130,
  168, 199, 156, 103, 186, 170, 85, 248, 149, 123, 203, 109, 98, 129, 140, 45,
  131, 193, 148, 111, 29, 124, 161, 112, 165, 212, 174, 108, 106, 188, 96, 114,
  158, 16, 122, 70, 49, 145, 128, 123, 155, 213, 214, 67, 186, 75, 46, 174,
]);

const Guardian: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const { setGuardians, guardians, programId, pda, account } = useGlobalState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const defaultpk = PublicKey.default;

  const router = useRouter();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleModalOk = (values: any) => {
    console.log("Values received:", values);
    setIsModalOpen(false);
    setGuardians((prev) => [...prev]);
  };

  const onFinish = async (values: any) => {
    console.log("Values received:", values);
    setLoading(true);

    // Instr Add
    const connection = new Connection("https://api.devnet.solana.com/");
    const idx1 = Buffer.from(new Uint8Array([1]));
    const new_acct_len = Buffer.from(
      new Uint8Array(new BN(1).toArray("le", 1))
    );

    const addToRecoveryListIx = new TransactionInstruction({
      keys: [
        {
          pubkey: pda ?? defaultpk,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: account?.publicKey ?? defaultpk,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: new PublicKey(values.guardian),
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: programId ?? new Keypair().publicKey,
      data: Buffer.concat([idx1, new_acct_len]),
    });

    const tx = new Transaction();
    tx.add(addToRecoveryListIx);

    const txid = await sendAndConfirmTransaction(
      connection,
      tx,
      [account ?? new Keypair()],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

    setLoading(false);
    setIsModalOpen(false);
    setGuardians((prev) => [...prev, new PublicKey(values.guardian)]);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
  };

  const handleOk = () => {
    setLoading(true);
    form.submit();
  };

  const handleCancel = () => {
    setVisible(false);
  };

  return (
    <>
      <h1 className={"title"}>Guardians</h1>
      <div>
        {guardians?.map((g) => {
          console.log(g);
          return <GuardianBox key={g.toBase58()} guardian={g}></GuardianBox>;
        })}
      </div>

      <Button type="primary" onClick={showModal}>
        Add New Guardian
      </Button>

      <Modal
        title="Add New Guardian"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleModalCancel}
        confirmLoading={loading}
      >
        {!loading && (
          <Form
            form={form}
            layout="vertical"
            name="form_in_modal"
            initialValues={{ modifier: "ff" }}
            onFinish={onFinish}
          >
            <Form.Item
              name="guardian"
              label="Guardian Public Key"
              rules={[
                {
                  required: true,
                  message: "Please input the public key of guardian",
                },
              ]}
            >
              <Input />
            </Form.Item>
            {/* <Form.Item name="description" label="Description">
            <Input type="textarea" />
          </Form.Item> */}
            <Form.Item
              name="modifier"
              className="collection-create-form_last-form-item"
            >
              <Radio.Group>
                <Radio value="ff">Friend / Family</Radio>
                <Radio value="hardware">Hardware</Radio>
              </Radio.Group>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* <PhraseBox guardian={guardians[0].publicKey.toBase58()}></PhraseBox> */}

      {/* {!loading && (
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
      )} */}

      {/* {loading && <LoadingOutlined style={{ fontSize: 24 }} spin />} */}
    </>
  );
};

export default Guardian;
