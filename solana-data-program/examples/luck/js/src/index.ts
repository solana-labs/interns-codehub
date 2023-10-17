import { keypairIdentity, Metaplex } from "@metaplex-foundation/js";
import {
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import * as bs58 from "bs58";
import * as dotenv from "dotenv";
import { DataProgram, programId as dataProgramId } from "solana-data-program";

dotenv.config();

const main = async () => {
  const shouldMint = process.argv.indexOf("--mint") > -1;

  // Public Key of NFT Lucky Number and NFT Metadata
  const luckImage = "Do8NDpNM7g6Kgg7JtvYBkj7wbh9sRmrFQt4AYyDyj4eN";
  const luckMetadata = "8iy6498fkpDVJ7MYRzDabX3i5k5qjtyeWY6jaqWrXkJH";

  const cluster = process.env.CLUSTER as string;

  const connection = new Connection(process.env.CONNECTION_URL as string);
  const wallet = Keypair.fromSecretKey(
    bs58.decode(process.env.AUTHORITY_PRIVATE as string)
  );

  // mint Lucky Number NFT with metadata
  if (shouldMint) {
    const base = process.env.BASE_URL as string;
    const api = process.env.DATA_ROUTE as string;
    const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet));
    metaplex
      .nfts()
      .create(
        {
          uri: `${base}${api}${luckMetadata}?cluster=${cluster}`,
          name: "Solana Lucky Number",
          sellerFeeBasisPoints: 0,
        },
        {
          commitment: "confirmed",
        }
      )
      .then(({ nft }) => {
        console.log(nft);
      });
  }

  const luckProgramId = new PublicKey(process.env.LUCK_PROGRAM_ID as string);
  const feePayer = wallet;

  // data account of NFT image
  const dataAccount = new PublicKey(luckImage);
  const [pdaData] = DataProgram.getPDA(dataAccount);

  const testLuckIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
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
        pubkey: dataProgramId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: luckProgramId,
    data: Buffer.concat([Buffer.from(new Uint8Array([0]))]),
  });

  const tx = new Transaction();
  tx.add(testLuckIx);

  const txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    confirmation: "confirmed",
  } as ConfirmOptions);
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=${cluster}`);
};

main()
  .then(() => console.log("success"))
  .catch((e) => console.error(e));
