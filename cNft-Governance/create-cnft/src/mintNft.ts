import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
    Metaplex,
    UploadMetadataInput,
    bundlrStorage,
    keypairIdentity,
    toMetaplexFile,
} from "@metaplex-foundation/js";
import * as fs from "fs";
import {
    TokenStandard,
} from "@metaplex-foundation/mpl-bubblegum";
import dotenv from "dotenv";
dotenv.config();

const EXTENSION = process.env.EXTENSION;

export async function mintNft(
    payer: Keypair,
    metaplex: Metaplex,
    collectionMint: PublicKey,
    nonce: number
) {
    if (!EXTENSION) {
        return console.warn("Please set EXTENSION in .env file")
    }
    const buffer = fs.readFileSync(`./src/assets/${nonce}.${EXTENSION}`);
    const file = toMetaplexFile(buffer, `${nonce}.${EXTENSION}`);
    const imageUri = await metaplex.storage().upload(file);

    const data = fs.readFileSync("./src/collection.json", "utf-8");
    const nftInfo = JSON.parse(data);

    const nftMetadata: UploadMetadataInput = {
        name: `${nftInfo.name ?? "NFT"} #${nonce}`,
        symbol: `${nftInfo.symbol ?? "NFT"}`,
        description: `${nftInfo.description ?? "placeholder description"}`,
        image: imageUri,
        properties: {
            files: [
                {
                    uri: `${nonce}.${EXTENSION}`,
                    type: `image/${EXTENSION}`,
                },
            ],
        },
    };
    const { uri } = await metaplex.nfts().uploadMetadata(nftMetadata);

    const { nft } = await metaplex.nfts().create(
        {
            uri: uri,
            name: nftMetadata.name!,
            sellerFeeBasisPoints: 0,
            symbol: nftMetadata.symbol,
            creators: [
                {
                    address: payer.publicKey,
                    share: 100,
                },
            ],
            uses: null,
            collection: collectionMint,
            isMutable: false,
            primarySaleHappened: false,
            tokenStandard: TokenStandard.NonFungible,
        },
        { commitment: "finalized" },
    );

    await metaplex.nfts().verifyCollection({
        mintAddress: nft.mint.address,
        collectionMintAddress: collectionMint,
        isSizedCollection: true,
    })
    console.log(
        console.log(`Nonce ${nonce} NFT minted`),
    );

}