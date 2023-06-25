import { loadPublicKeysFromFile } from "@/utils/helper";
import { ReadApiConnection } from "@metaplex-foundation/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssetsByOwner, getAsset } from "@/utils/read-api";

import dotenv from "dotenv";
dotenv.config();

(async () => {
    const client = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY ?? "[]"))
    );
    console.log("client: ", client.publicKey.toBase58());

    const RPC_URL = process.env.RPC_URL ?? "";
    if (!RPC_URL) {
        return console.warn("Please set RPC_URL from Helius");
    }
    const connection = new Connection(RPC_URL, "confirmed");
    const balance = await connection.getBalance(client.publicKey);
    console.log("balance: ", balance);

    let keys = loadPublicKeysFromFile();
    if (!keys?.collectionMint || !keys?.treeAddress) {
        return console.warn("Please create collection and tree first");
    }

    const treeAddress = keys.treeAddress;
    const collectionMint = keys.collectionMint;
    console.log("==== Local PublicKeys loaded ====");
    console.log("Tree address:", treeAddress.toBase58());
    console.log("Collection mint:", collectionMint.toBase58());

    await getAssetsByOwner(connection, {
        ownerAddress: client.publicKey.toBase58(),
    }).then((res) => {
        console.log("Total assets returned: ", res.total);

        res.items
            ?.filter((asset) => asset.compression.tree === treeAddress.toBase58())
            ?.map((asset) => {
                // display some info about the asset
                console.log("assetId:", asset.id);
                console.log("ownership:", asset.ownership);
                console.log("compression:", asset.compression);
                console.log("collection:", asset.grouping[0].group_value);
                console.log(asset);
            });
    });

    // await getAsset(connection, new PublicKey("24WmsGtDvDpgywdgYxPYNxE55hbEcP9pPYzvzAbsj2Zh"))
    //     .then((res) => {
    //         console.log(res);
    //     })
})();
