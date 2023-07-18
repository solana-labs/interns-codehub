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

export async function mintNft(
    payer: Keypair,
    metaplex: Metaplex,
    collectionMint: PublicKey,
    nonce: number
) {
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
            collection: null,
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