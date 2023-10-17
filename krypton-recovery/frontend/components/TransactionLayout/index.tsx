// Import any additional classes and/or functions needed from Solana's web3.js library as you go along:
import React, { useState, ReactElement } from "react";
import { message } from "antd";
import { useGlobalState } from "../../context";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmRawTransaction, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
const converter = require("number-to-words");
import { LoadingOutlined } from "@ant-design/icons";
import { refreshBalance } from "../../utils";
import {
  CheckContainer,
  CheckImage,
  CheckFrom,
  Processed,
  CheckDate,
  RecipientInput,
  AmountInput,
  SignatureInput,
  AmountText,
  RatioText,
} from "../../styles/StyledComponents.styles";

type FormT = {
  from: string;
  to: string;
  amount: number;
  isSigned: boolean;
};

const defaultForm: FormT = {
  from: "",
  to: "",
  amount: 0,
  isSigned: false,
};

const TransactionModal = (): ReactElement => {
  const { network, account, balance, setBalance } = useGlobalState();
  const [form, setForm] = useState<FormT>(defaultForm);
  const [sending, setSending] = useState<boolean>(false);
  const [transactionSig, setTransactionSig] = useState<string>("");

  const onFieldChange = (field: string, value: string) => {
    if (field === "amount" && !!value.match(/\D+/)) {
      console.log(value);
      return;
    }

    setForm({
      ...form,
      [field]: value,
    });
  };

  // *Step 5*: implement a function that transfer funds
  const transfer = async () => {
    // This line ensures the function returns before running if no account has been set
    if (!account) return;

    try {
      // (a) review the import guidance on line 1
      // (b) instantiate a connection using clusterApiUrl with the active network passed in as an argument
      // Documentation References:
      //   https://solana-labs.github.io/solana-web3.js/classes/Connection.html
      //   https://solana-labs.github.io/solana-web3.js/modules.html#clusterApiUrl
      const connection = new Connection(clusterApiUrl(network), "confirmed");
      setTransactionSig("");
      // (c) leverage the SystemProgram class to create transfer instructions that include your account's public key, the public key from your sender field in the form, and the amount from the form
      // Documentation Reference:
      //   https://solana-labs.github.io/solana-web3.js/classes/SystemProgram.html
      //   https://solana-labs.github.io/solana-web3.js/classes/SystemProgram.html#transfer
      const instructions = SystemProgram.transfer({
        fromPubkey: account.publicKey,
        toPubkey: new PublicKey(form.to),
        lamports: form.amount,
      });

      // (d) instantiate a transaction object and add the instructions
      // Documentation Reference:
      //   https://solana-labs.github.io/solana-web3.js/classes/Transaction.html
      //   https://solana-labs.github.io/solana-web3.js/classes/Transaction.html#add
      const transaction = new Transaction().add(instructions);

      // (e) use your account to create a signers interface
      // Documentation Reference:
      //   https://solana-labs.github.io/solana-web3.js/interfaces/Signer.html
      //   note: signers is an array with a single item - an object with two properties
      const signers = [{
        publicKey: account.publicKey,
        secretKey: account.secretKey,
      }];

      setSending(true);
      // (f) send the transaction and await its confirmation
      // Documentation Reference: https://solana-labs.github.io/solana-web3.js/modules.html#sendAndConfirmTransaction
      const confirmation = await sendAndConfirmTransaction(connection, transaction, signers);
      setTransactionSig(confirmation);
      setSending(false);

      if (network) {
        const updatedBalance = await refreshBalance(network, account);
        setBalance(updatedBalance);
        message.success(`Transaction confirmed`);
      }
      // (g) You can now delete the console.log statement since the function is implemented!
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown Error";
      message.error(
        `Transaction failed, please check your inputs: ${errorMessage}`
      );
      setSending(false);
    }
  };

  return (
    <>
      <CheckContainer>
        <CheckImage src="/check.jpeg" alt="Check" />
        <CheckFrom>{`FROM: ${account?.publicKey}`}</CheckFrom>

        {transactionSig && (
          <Processed
            href={`https://explorer.solana.com/tx/${transactionSig}?cluster=devnet`}
            target="_blank"
          >
            Processed - Review on Solana Block Explorer
          </Processed>
        )}

        <CheckDate>
          {new Date().toString().split(" ").slice(1, 4).join(" ")}
        </CheckDate>
        <RecipientInput
          value={form.to}
          onChange={(e) => onFieldChange("to", e.target.value)}
        />
        <AmountInput
          value={form.amount}
          onChange={(e) => onFieldChange("amount", e.target.value)}
        />
        <AmountText>
          {form.amount <= 0 ? "" : converter.toWords(form.amount)}
        </AmountText>
        {sending ? (
          <LoadingOutlined
            style={{
              fontSize: 24,
              position: "absolute",
              top: "69%",
              left: "73%",
            }}
            spin
          />
        ) : (
          <SignatureInput
            onClick={transfer}
            disabled={
              !balance ||
              form.amount / LAMPORTS_PER_SOL > balance ||
              !form.to ||
              form.amount == 0
            }
            type="primary"
          >
            Sign and Send
          </SignatureInput>
        )}
        <RatioText>1 $SOL = 1,000,000,000 $L</RatioText>
      </CheckContainer>
    </>
  );
};

export default TransactionModal;
