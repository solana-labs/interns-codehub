import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  Metaplex,
  UploadMetadataInput,
  bundlrStorage,
  keypairIdentity,
  toMetaplexFile,
} from "@metaplex-foundation/js";
import * as fs from "fs";
import {
  MetadataArgs,
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
  createMintToCollectionV1Instruction,
  TokenProgramVersion,
  TokenStandard,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";


export async function mintCompressedNft(
  payer: Keypair,
  connection: Connection,
  treeAddress: PublicKey,
  treeAuthority: PublicKey,
  collectionMint: PublicKey,
  collectionMetadataAccount: PublicKey,
  collectionMasterEditionAccount: PublicKey,
  nonce: number
) {
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payer))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    );

  // create nft metadata
  const buffer = fs.readFileSync(`./src/assets/dog${nonce}.jpeg`);
  const file = toMetaplexFile(buffer, `dog${nonce}.jpeg`);
  const imageUri = await metaplex.storage().upload(file);

  const nftMetadata: UploadMetadataInput = {
    name: `Doggy cNFT #${nonce}`,
    symbol: "DWFC",
    description: "The Studious Dog are smart and productive dogs.",
    image: imageUri,
    properties: {
      files: [
        {
          uri: `dog${nonce}.jpeg`,
          type: "image/jpeg",
        },
      ],
    },
  };
  const { uri } = await metaplex.nfts().uploadMetadata(nftMetadata);

  // create compressed nft
  const compressedNftMetadata: MetadataArgs = {
    name: nftMetadata.name ?? "",
    symbol: nftMetadata.symbol ?? "",
    uri,
    sellerFeeBasisPoints: 0,
    creators: [
      {
        address: payer.publicKey,
        verified: true,
        share: 100,
      },
    ],
    editionNonce: 0,
    uses: null,
    collection: null,
    isMutable: false,
    primarySaleHappened: false,
    tokenProgramVersion: TokenProgramVersion.Original,
    tokenStandard: TokenStandard.NonFungible,
  };

  const receiverAddress = payer.publicKey;
  // derive PDA (owned bt Bubblegum) to act as the signer of the compressed minting
  const [bubblegumSigner, _bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection_cpi", "utf8")],
    BUBBLEGUM_PROGRAM_ID
  );

  const mintToCollectionIx = createMintToCollectionV1Instruction(
    {
      payer: payer.publicKey,
      merkleTree: treeAddress,
      treeAuthority: treeAuthority,
      treeDelegate: payer.publicKey,

      collectionMint: collectionMint,
      collectionAuthority: payer.publicKey,
      collectionMetadata: collectionMetadataAccount,
      collectionAuthorityRecordPda: BUBBLEGUM_PROGRAM_ID,
      editionAccount: collectionMasterEditionAccount,

      leafOwner: receiverAddress,
      leafDelegate: payer.publicKey,

      // other accounts
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      bubblegumSigner: bubblegumSigner,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    },
    {
      metadataArgs: Object.assign(compressedNftMetadata, {
        collection: { key: collectionMint, verified: false },
      }),
    }
  );

  try {
    const tx = new Transaction();
    tx.add(mintToCollectionIx);

    const txSig = await sendAndConfirmTransaction(
      connection,
      tx,
      [payer],
      {
        commitment: "confirmed",
        skipPreflight: false,
      }
    )
    console.log(`Nonce ${nonce} Compressed NFT minted`)
    return txSig;
  } catch (e) {
    console.error(e);
    throw e;
  }

}