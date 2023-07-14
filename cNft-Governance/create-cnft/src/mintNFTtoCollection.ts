import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  loadNonceFromFile,
  saveNonceToFile,
  loadPublicKeysFromFile,
} from "@/utils/helper";
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
  TokenProgramVersion,
  TokenStandard,
} from "@metaplex-foundation/mpl-bubblegum";
import { mintCompressedNft } from "@/utils/mint-cnft";
import dotenv from "dotenv";
dotenv.config();

(async () => {
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY ?? "[]"))
  );
  console.log("payer: ", payer.publicKey.toBase58());

  const connection = new Connection(process.env.RPC_URL ?? "", "confirmed");
  const balance = await connection.getBalance(payer.publicKey);
  console.log("balance: ", balance);

  let keys = loadPublicKeysFromFile();

  if (!keys?.collectionMint || !keys?.treeAddress) {
    return console.warn("Please create collection and tree first");
  }

  const treeAddress: PublicKey = keys.treeAddress;
  const treeAuthority: PublicKey = keys.treeAuthority;
  const collectionMint: PublicKey = keys.collectionMint;
  const collectionMetadataAccount: PublicKey = keys.collectionMetadataAccount;
  const collectionMasterEditionAccount: PublicKey =
    keys.collectionMasterEditionAccount;
  console.log("==== Local PublicKeys loaded ====");
  console.log("Tree address:", treeAddress.toBase58());
  console.log("Tree authority:", treeAuthority.toBase58());
  console.log("Collection mint:", collectionMint.toBase58());
  console.log("Collection metadata:", collectionMetadataAccount.toBase58());
  console.log(
    "Collection master edition:",
    collectionMasterEditionAccount.toBase58()
  );

  let nonce = loadNonceFromFile();
  console.log(nonce.nonce);
  // if (!nonce?.nonce) {
  //     return console.warn("Please create nonce first");
  // }

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
  const buffer = fs.readFileSync(`./src/assets/dog${nonce.nonce}.jpeg`);
  const file = toMetaplexFile(buffer, `dog${nonce.nonce}.jpeg`);
  const imageUri = await metaplex.storage().upload(file);

  const nftMetadata: UploadMetadataInput = {
    name: `Doggy cNFT #${nonce.nonce}`,
    symbol: "DWFC",
    description: "The Studious Dog are smart and productive dogs.",
    image: imageUri,
    properties: {
      files: [
        {
          uri: `dog${nonce.nonce}.jpeg`,
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

  console.log(compressedNftMetadata);

  const receiverAddress = payer.publicKey;
  const mintToWallet = await mintCompressedNft(
    connection,
    payer,
    treeAddress,
    treeAuthority,
    collectionMint,
    collectionMetadataAccount,
    collectionMasterEditionAccount,
    compressedNftMetadata,
    receiverAddress //payer in this case, mint to myself
  );
  console.log(
    `Minting a single compressed NFT to ${receiverAddress.toBase58()}...`
  );
  // console.log("transacition hash ", mintToWallet);

  saveNonceToFile(nonce.nonce + 1);
})();
