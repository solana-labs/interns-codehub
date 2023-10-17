import React, { ReactElement, useEffect, useState } from "react";
import { Button, Typography } from "antd";
import { Box } from "../../styles/StyledComponents.styles";
import { LoadingOutlined } from "@ant-design/icons";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { useGlobalState } from "../../context";

const BN = require("bn.js");

const { Paragraph } = Typography;

const GuardianBox = ({ guardian }: { guardian: PublicKey }): ReactElement => {
  const {
    setAccount,
    mnemonic,
    setMnemonic,
    setGuardians,
    guardians,
    programId,
    pda,
    account,
  } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);

  const onDelete = async () => {
    setLoading(true)
    const connection = new Connection("https://api.devnet.solana.com/");
    const defaultpk = PublicKey.default;

    const idx3 = Buffer.from(new Uint8Array([3]));
    const new_acct_len = Buffer.from(
      new Uint8Array(new BN(1).toArray("le", 1))
    );

    const deleteFromRecoveryIx = new TransactionInstruction({
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
          pubkey: guardian,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: programId ?? defaultpk,
      data: Buffer.concat([idx3, new_acct_len]),
    });

    const tx = new Transaction();
    tx.add(deleteFromRecoveryIx);

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

    var newGuard = guardians.filter((g) => {
      return g.toBase58() !== guardian.toBase58();
    });
    console.log(newGuard);
    setGuardians(newGuard);
    setLoading(false);
  };

  //   useEffect(() => {
  //     console.log("rerendered cuz guardians changed: ", guardians)
  //   }, [guardians])

  return (
    <Box>
      <Paragraph>{guardian.toBase58()}</Paragraph>
      {!loading && <Button onClick={onDelete} danger>
        Delete
      </Button>}
      {loading && <LoadingOutlined style={{ fontSize: 24 }} spin />}
    </Box>
  );
};

export default GuardianBox;
