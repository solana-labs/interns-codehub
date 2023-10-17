import {
  Cluster,
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { programId as DATA_PROGRAM_ID, DataProgram } from "solana-data-program";
import { sendAndConfirmTransactionWithAccount } from "..";
import { KeypairSigner, Signer } from "../../types/account";
import { AVATAR_PROGRAM_ID } from "./constants";
import { svgPKs } from "./svg-pubkeys";

export const generateAvatar = async (
  network: Cluster,
  connection: Connection,
  wallet: Signer,
  identity: PublicKey,
  update: () => void
) => {
  const feePayerPK = await wallet.getPublicKey();
  let recentBlockhash: Readonly<{
    blockhash: string;
    lastValidBlockHeight: number;
  }>;

  // data account of avatar
  const dataAccountKP = new Keypair();
  const dataAccountSigner = new KeypairSigner(dataAccountKP);
  const [pdaData] = DataProgram.getPDA(dataAccountKP.publicKey);
  const initializeIx = DataProgram.initializeDataAccount(
    feePayerPK,
    dataAccountKP.publicKey,
    feePayerPK,
    false,
    true,
    200
  );
  recentBlockhash = await connection.getLatestBlockhash();
  const initializeTx = new Transaction({
    feePayer: feePayerPK,
    ...recentBlockhash,
  });
  initializeTx.add(initializeIx);
  const initializeTxid = await sendAndConfirmTransactionWithAccount(
    connection,
    initializeTx,
    [wallet, dataAccountSigner],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    } as ConfirmOptions
  );
  console.log(
    `init: https://explorer.solana.com/tx/${initializeTxid}?cluster=${network}`
  );
  update();
  const dataAccount = dataAccountKP.publicKey;

  const partsTx: Transaction[] = [];
  const initializeIdentityIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayerPK,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pdaData,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: DATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: AVATAR_PROGRAM_ID,
    data: Buffer.concat([
      Buffer.from(new Uint8Array([0])),
      identity.toBuffer(),
    ]),
  });
  initializeIdentityIx.keys.push({
    pubkey: svgPKs["env"][0],
    isSigner: false,
    isWritable: false,
  });
  initializeIdentityIx.keys.push({
    pubkey: svgPKs["head"][0],
    isSigner: false,
    isWritable: false,
  });
  const initializeIdentityTx = new Transaction();
  initializeIdentityTx.add(initializeIdentityIx);
  partsTx.push(initializeIdentityTx);

  const appendIdentityCloIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayerPK,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pdaData,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: DATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: AVATAR_PROGRAM_ID,
    data: Buffer.concat([
      Buffer.from(new Uint8Array([1])),
      identity.toBuffer(),
    ]),
  });
  svgPKs["clo"].forEach((part) => {
    appendIdentityCloIx.keys.push({
      pubkey: part,
      isSigner: false,
      isWritable: false,
    });
  });
  const appendIdentityCloTx = new Transaction();
  appendIdentityCloTx.add(appendIdentityCloIx);
  partsTx.push(appendIdentityCloTx);

  const appendIdentityTopIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayerPK,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pdaData,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: DATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: AVATAR_PROGRAM_ID,
    data: Buffer.concat([
      Buffer.from(new Uint8Array([2])),
      identity.toBuffer(),
    ]),
  });
  svgPKs["top"].forEach((part) => {
    appendIdentityTopIx.keys.push({
      pubkey: part,
      isSigner: false,
      isWritable: false,
    });
  });
  const appendIdentityTopTx = new Transaction();
  appendIdentityTopTx.add(appendIdentityTopIx);
  partsTx.push(appendIdentityTopTx);

  const appendIdentityEyesIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayerPK,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pdaData,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: DATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: AVATAR_PROGRAM_ID,
    data: Buffer.concat([
      Buffer.from(new Uint8Array([3])),
      identity.toBuffer(),
    ]),
  });
  svgPKs["eyes"].forEach((part) => {
    appendIdentityEyesIx.keys.push({
      pubkey: part,
      isSigner: false,
      isWritable: false,
    });
  });
  const appendIdentityEyesTx = new Transaction();
  appendIdentityEyesTx.add(appendIdentityEyesIx);
  partsTx.push(appendIdentityEyesTx);

  const appendIdentityMouthIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayerPK,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pdaData,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: DATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: AVATAR_PROGRAM_ID,
    data: Buffer.concat([
      Buffer.from(new Uint8Array([4])),
      identity.toBuffer(),
    ]),
  });
  svgPKs["mouth"].forEach((part) => {
    appendIdentityMouthIx.keys.push({
      pubkey: part,
      isSigner: false,
      isWritable: false,
    });
  });
  const appendIdentityMouthTx = new Transaction();
  appendIdentityMouthTx.add(appendIdentityMouthIx);
  partsTx.push(appendIdentityMouthTx);

  const completeIdentityIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayerPK,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pdaData,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: DATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: AVATAR_PROGRAM_ID,
    data: Buffer.concat([Buffer.from(new Uint8Array([5]))]),
  });
  const completeIdentityTx = new Transaction();
  completeIdentityTx.add(completeIdentityIx);
  partsTx.push(completeIdentityTx);

  recentBlockhash = await connection.getLatestBlockhash();
  for (const tx of partsTx) {
    tx.feePayer = feePayerPK;
    tx.recentBlockhash = recentBlockhash.blockhash;
    const txid = await sendAndConfirmTransactionWithAccount(
      connection,
      tx,
      [wallet],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        confirmation: "confirmed",
      } as ConfirmOptions
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=${network}`);
    update();
  }

  console.log("Data Account: ", dataAccount.toString());
  return dataAccount;
};

export const getAvatar = async (connection: Connection, dataKey: PublicKey) => {
  return await DataProgram.parseData(connection, dataKey, "confirmed");
};
