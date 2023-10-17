import {
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { DataProgram, DataTypeOption } from "solana-data-program";

const PART_SIZE = 881;

const main = async (
  connection: Connection,
  feePayer: Keypair,
  data: Buffer,
  dataType: DataTypeOption,
  isDynamic: boolean,
  dataPK?: PublicKey
) => {
  let dataAccount = dataPK;
  let pda: PublicKey | undefined;
  if (!dataAccount) {
    const [createIx, newAccount] = await DataProgram.createDataAccount(
      connection,
      feePayer.publicKey,
      data.length
    );
    const createTx = new Transaction();
    createTx.add(createIx);
    console.log("creating new data account");
    await sendAndConfirmTransaction(
      connection,
      createTx,
      [feePayer, newAccount],
      {
        skipPreflight: true,
      } as ConfirmOptions
    );

    const [newPDA] = DataProgram.getPDA(newAccount.publicKey);
    const initializeIx = DataProgram.initializeDataAccount(
      feePayer.publicKey,
      newAccount.publicKey,
      feePayer.publicKey,
      true,
      isDynamic,
      data.length
    );
    const initializeTx = new Transaction();
    initializeTx.add(initializeIx);
    console.log("initializing data account and pda");
    await sendAndConfirmTransaction(
      connection,
      initializeTx,
      [feePayer, newAccount],
      {
        skipPreflight: true,
      } as ConfirmOptions
    );

    dataAccount = newAccount.publicKey;
    pda = newPDA;
  }
  if (!pda) {
    [pda] = DataProgram.getPDA(dataAccount);
  }
  console.log("Feepayer:", feePayer.publicKey.toBase58());
  console.log("Data Account:", dataAccount.toBase58());
  console.log("PDA:", pda.toBase58());

  console.log("data length:", data.length);
  const parts = Math.ceil(data.length / PART_SIZE);
  console.log("total parts:", parts);

  const allTxs: Transaction[] = [];
  let current = 0;
  while (current < parts) {
    const part = data.subarray(current * PART_SIZE, (current + 1) * PART_SIZE);
    const offset = current * PART_SIZE;
    const tx = new Transaction();
    tx.add(
      DataProgram.updateDataAccount(
        feePayer.publicKey,
        dataAccount,
        dataType,
        part,
        offset,
        false,
        false
      )
    );
    allTxs.push(tx);
    ++current;
  }

  console.log("uploading parts...");
  current = 0;
  for (const tx of allTxs) {
    const txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
      skipPreflight: true,
    } as ConfirmOptions);
    console.log(
      `${
        current + 1
      }/${parts}: https://explorer.solana.com/tx/${txid}?cluster=devnet`
    );
    ++current;
  }

  console.log(`all ${parts} parts uploaded: ${dataAccount}`);
};

export default main;
