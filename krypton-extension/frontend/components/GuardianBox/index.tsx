import React, { useState } from "react";
import { Button } from "antd";
import { Box } from "../../styles/StyledComponents.styles";
import { LoadingOutlined } from "@ant-design/icons";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { useGlobalState } from "../../context";
import {
  displayAddress,
  sendAndConfirmTransactionWithAccount,
} from "../../utils";
import BN from "bn.js";
import Paragraph from "antd/lib/typography/Paragraph";
import { RPC_URL, WALLET_PROGRAM_ID } from "../../utils/constants";

const GuardianBox = ({
  guardian,
  editMode,
}: {
  guardian: PublicKey;
  editMode: boolean;
}) => {
  const { setGuardians, guardians, account, network } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);

  const onDelete = async () => {
    if (!account) {
      return;
    }
    setLoading(true);
    const connection = new Connection(RPC_URL(network), "confirmed");
    const feePayerPK = new PublicKey(account.pk);
    const defaultpk = PublicKey.default;

    const idx3 = Buffer.from(new Uint8Array([3]));
    const new_acct_len = Buffer.from(
      new Uint8Array(new BN(1).toArray("le", 1))
    );

    const deleteFromRecoveryIx = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey(account.pda) ?? defaultpk,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayerPK,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: guardian,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: WALLET_PROGRAM_ID,
      data: Buffer.concat([idx3, new_acct_len]),
    });

    const recentBlockhash = await connection.getLatestBlockhash();
    // TODO: Check if Yubikey is connected
    const tx = new Transaction({
      feePayer: feePayerPK,
      ...recentBlockhash,
    });
    tx.add(deleteFromRecoveryIx);

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

    const newGuard = guardians.filter((g) => {
      return g.toBase58() !== guardian.toBase58();
    });
    console.log(newGuard);
    setGuardians(newGuard);
    setLoading(false);
  };

  return (
    <Box
      style={{
        display: "flex",
        width: "350px",
        justifyContent: "space-evenly",
        marginTop: "10px",
      }}
    >
      <Paragraph copyable={{ text: guardian.toBase58(), tooltips: `Copy` }}>
        {displayAddress(guardian.toBase58())}
      </Paragraph>

      {!loading && editMode && (
        <Button type="primary" onClick={onDelete} danger>
          Delete
        </Button>
      )}

      {loading && editMode && (
        <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />
      )}
    </Box>
  );
};

export default GuardianBox;
