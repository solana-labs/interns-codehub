import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Alert, Modal, Form, Input, Radio, Switch } from "antd";
import { useGlobalState } from "../context";
import { UserAddOutlined, EditOutlined } from "@ant-design/icons";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import GuardianBox from "../components/GuardianBox";
import base58 from "bs58";
import { containsPk, sendAndConfirmTransactionWithAccount } from "../utils";
import BN from "bn.js";
import { RPC_URL, WALLET_PROGRAM_ID } from "../utils/constants";

const Guardian: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [isPkValid, setIsPkValid] = useState<boolean>(false);
  const [editmode, setEditmode] = useState<boolean>(false);
  const [thres, setThres] = useState<number>(0);
  const { setGuardians, guardians, account, network } = useGlobalState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const defaultpk = PublicKey.default;

  useEffect(() => {
    // Fetching all guardians from PDA
    const getGuardians = async () => {
      if (!account) {
        return;
      }
      const connection = new Connection(RPC_URL(network), "confirmed");
      const publicKey = new PublicKey(account.pk);
      console.log("account pk: ", publicKey.toBase58());
      console.log("PDA: ", account.pda);
      const pda_account = await connection.getAccountInfo(
        new PublicKey(account.pda) ?? PublicKey.default
      );
      const pda_data = pda_account?.data ?? Buffer.from("");
      const threshold = new BN(pda_data.subarray(0, 1), "le").toNumber();
      const guardian_len = new BN(pda_data.subarray(1, 5), "le").toNumber();
      console.log("threshold: ", threshold);
      console.log("guardian length: ", guardian_len);
      console.log("All Guardians:");
      const guardians_tmp: PublicKey[] = [];
      for (let i = 0; i < guardian_len; i++) {
        const guard = new PublicKey(
          base58.encode(pda_data.subarray(5 + 32 * i, 5 + 32 * (i + 1)))
        );
        console.log(`guard ${i + 1}: `, guard.toBase58());
        guardians_tmp.push(guard);
      }
      setThres(threshold);
      setGuardians(guardians_tmp);
    };
    getGuardians();
  }, [account, network, setGuardians]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const onFinish = async (values: any) => {
    if (!account) {
      return;
    }

    console.log("=====ADDING GUARDIAN======");
    console.log("Values received:", values);
    setLoading(true);
    form.resetFields();

    // Instr Add
    const publicKey = new PublicKey(account.pk);
    console.log("Adding guardian for account " + publicKey + "...");
    const connection = new Connection(RPC_URL(network), "confirmed");
    const idx1 = Buffer.from(new Uint8Array([1]));
    const new_acct_len = Buffer.from(
      new Uint8Array(new BN(1).toArray("le", 1))
    );
    const latestBlockhash = await connection.getLatestBlockhash();

    const addToRecoveryListIx = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey(account.pda) ?? defaultpk,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: new PublicKey(values.guardian),
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: WALLET_PROGRAM_ID,
      data: Buffer.concat([idx1, new_acct_len]),
    });

    // TODO: Check if Yubikey is connected
    const tx = new Transaction({
      feePayer: publicKey,
      ...latestBlockhash,
    });
    tx.add(addToRecoveryListIx);

    const txid = await sendAndConfirmTransactionWithAccount(
      connection,
      tx,
      [account],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=${network}`);

    setLoading(false);
    setIsModalOpen(false);
    setGuardians((prev) => [...prev, new PublicKey(values.guardian)]);
    form.resetFields();
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const toggleEditmode = () => {
    setEditmode(!editmode);
  };

  return (
    <>
      <h1 className={"title"} style={{ marginBottom: "10px" }}>
        Guardians
      </h1>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <p style={{ marginRight: "10px" }}>Guardian Protection: </p>
        <Switch
          checkedChildren="on"
          unCheckedChildren="off"
          disabled={true}
          checked={guardians.length >= thres}
        />
      </div>

      <div style={{ overflow: "auto", height: "250px" }}>
        {guardians?.map((g) => {
          return (
            <GuardianBox
              key={g.toBase58()}
              guardian={g}
              editMode={editmode}
            ></GuardianBox>
          );
        })}
      </div>

      {guardians.length < thres && (
        <Alert
          message={`Need ${
            thres - guardians.length
          } more guardian(s) to activate recovery feature`}
          type="warning"
          style={{ width: "85%", position: "absolute", bottom: "95px" }}
          showIcon
        />
      )}

      <div style={{ display: "flex", position: "absolute", bottom: "90px" }}>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={showModal}
          size="middle"
          style={{ width: "168px", marginRight: "20px" }}
        >
          Add
        </Button>

        {!editmode && (
          <Button
            icon={<EditOutlined />}
            onClick={toggleEditmode}
            size="middle"
            style={{ width: "168px" }}
            className="edit-btn"
            danger
          >
            Edit
          </Button>
        )}

        {editmode && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={toggleEditmode}
            size="middle"
            style={{ width: "168px" }}
            danger
            className="edit-btn"
          >
            Finish
          </Button>
        )}
      </div>

      <Modal
        title="Add New Guardian"
        open={isModalOpen}
        onOk={form.submit}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        okButtonProps={{ disabled: !isPkValid }}
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
                  async validator(_, value) {
                    if (containsPk(value, guardians)) {
                      setIsPkValid(false);
                      return Promise.reject(
                        new Error("Duplicate guardian key")
                      );
                    }

                    const connection = new Connection(
                      RPC_URL(network),
                      "confirmed"
                    );
                    const pda_account = await connection.getAccountInfo(
                      new PublicKey(value)
                    );
                    console.log("checking if PDA is valid: ", pda_account);
                    if (PublicKey.isOnCurve(value) || pda_account != null) {
                      setIsPkValid(true);
                      return Promise.resolve();
                    }
                    setIsPkValid(false);
                    return Promise.reject(new Error("Invalid public key"));
                  },
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
          </Form>
        )}
      </Modal>
    </>
  );
};

export default Guardian;
