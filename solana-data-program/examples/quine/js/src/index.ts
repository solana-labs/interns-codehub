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
import BN from "bn.js";
import * as bs58 from "bs58";
import * as dotenv from "dotenv";
import { DataProgram, programId as dataProgramId } from "solana-data-program";

dotenv.config();

const main = async () => {
  const shouldMint = process.argv.indexOf("--mint") > -1;
  const updateMetadata = process.argv.indexOf("--update-metadata") > -1;
  const appendMetadata = process.argv.indexOf("--append-metadata") > -1;
  const shouldUpdate = process.argv.indexOf("--update") > -1;

  if (!shouldMint && !updateMetadata && !appendMetadata && !shouldUpdate) {
    console.error("no argument flag passed");
    return;
  }

  // Public Key of NFT Quine Sphere and NFT Metadata
  const quineSphere = "HoyEJgwKhQG1TPRB2ziBU9uGziwy4f25kDcnKDNgsCkg";
  const quineMetadata = "Hb9vkWax5AeLWvCtYSjSvWrN6gTw324gKMa28kcBsgT3";

  const METADATA_UPDATE_IDENTIFIER = `"value":"`;
  const METADATA_APPEND_IDENTIFIER = `],"properties":`;

  const cluster = process.env.CLUSTER as string;

  const connection = new Connection(process.env.CONNECTION_URL as string);
  const wallet = Keypair.fromSecretKey(
    bs58.decode(process.env.AUTHORITY_PRIVATE as string)
  );

  // mint Quine Sphere NFT with metadata
  if (shouldMint) {
    const base = process.env.BASE_URL as string;
    const api = process.env.DATA_ROUTE as string;
    const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet));
    metaplex
      .nfts()
      .create(
        {
          uri: `${base}${api}${quineMetadata}?cluster=${cluster}`,
          name: "Solana Quine Sphere NFT",
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

  const quineProgramId = new PublicKey(process.env.QUINE_PROGRAM_ID as string);
  const feePayer = wallet;

  // data account of NFT image
  const dataAccount = new PublicKey(quineSphere);
  const [pdaData] = DataProgram.getPDA(dataAccount);

  // data account of NFT metadata JSON
  const metadataAccount = new PublicKey(quineMetadata);
  const [pdaMeta] = DataProgram.getPDA(metadataAccount);

  // calculate metadata update and append offsets
  let updateOffset: number = 322;
  let appendOffset: number = 180;

  const metadataBuffer = await DataProgram.parseData(
    connection,
    new PublicKey(quineMetadata),
    "confirmed"
  );

  if (!metadataBuffer) {
    console.error("invalid metadata account");
    return;
  }

  try {
    const metadataJSON = JSON.stringify(JSON.parse(metadataBuffer.toString()));
    updateOffset = metadataJSON.indexOf(METADATA_UPDATE_IDENTIFIER);
    appendOffset = metadataJSON.indexOf(METADATA_APPEND_IDENTIFIER);

    if (updateOffset === -1 || appendOffset === -1) {
      console.error("invalid metadata JSON");
      return;
    }

    appendOffset = metadataJSON.length - appendOffset;
    updateOffset += METADATA_UPDATE_IDENTIFIER.length;
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    }
    return;
  }

  const metadataUpdateOffset = new BN(updateOffset).toArrayLike(
    Buffer,
    "le",
    8
  );
  const updateQuineMetadataIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: metadataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pdaMeta,
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
    programId: quineProgramId,
    data: Buffer.concat([
      Buffer.from(new Uint8Array([0])),
      metadataUpdateOffset,
    ]),
  });

  const metadataEndOffset = new BN(appendOffset).toArrayLike(Buffer, "le", 8);
  const appendQuineMetadataIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: metadataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pdaMeta,
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
    programId: quineProgramId,
    data: Buffer.concat([Buffer.from(new Uint8Array([1])), metadataEndOffset]),
  });

  const colorUpdateOffset = new BN(3624).toArrayLike(Buffer, "le", 8);
  const updateQuineColorIx = new TransactionInstruction({
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
    programId: quineProgramId,
    data: Buffer.concat([Buffer.from(new Uint8Array([2])), colorUpdateOffset]),
  });

  const tx = new Transaction();

  // update metadata
  if (updateMetadata) {
    tx.add(updateQuineMetadataIx);
  }

  // append metadata
  if (appendMetadata) {
    tx.add(appendQuineMetadataIx);
  }

  // update color
  if (shouldUpdate) {
    tx.add(updateQuineColorIx);
  }

  if (tx.instructions.length > 0) {
    const txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    } as ConfirmOptions);
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=${cluster}`);
  }
};

main()
  .then(() => console.log("success"))
  .catch((e) => console.error(e));
