import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import {
    loadNonceFromFile,
    loadPublicKeysFromFile,
} from "@/utils/helper";
import {
    Metaplex,
    bundlrStorage,
    keypairIdentity,
} from "@metaplex-foundation/js";
import { createNftCollection } from "./createCollection";
import { createTree } from "./createTree";
import { mintNft } from "./mintNft";
import { mintCompressedNft } from "./mintCompressedNft";

(async () => {
    const payer = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY ?? "[]"))
    );
    console.log("payer: ", payer.publicKey.toBase58());

    const connection = new Connection(process.env.RPC_URL ?? "", "confirmed");
    const balance = await connection.getBalance(payer.publicKey);
    console.log("balance: ", balance);

    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(payer))
        .use(
            bundlrStorage({
                address: "https://devnet.bundlr.network",
                providerUrl: "https://api.devnet.solana.com",
                timeout: 60000,
            })
        );

    let keys = loadPublicKeysFromFile();
    if (!keys?.collectionMint || !keys?.collectionMetadataAccount || !keys?.collectionMasterEditionAccount) {
        await createNftCollection(payer, connection, metaplex);
    }

    if (!keys?.treeAddress1 || !keys?.treeAuthority1) {
        await createTree(payer, connection, 1, { maxDepth: 5, maxBufferSize: 8 });
    }

    if (!keys?.treeAddress2 || !keys?.treeAuthority2) {
        await createTree(payer, connection, 2, { maxDepth: 14, maxBufferSize: 64 });
    }
    keys = loadPublicKeysFromFile();
    const treeAddress1: PublicKey = keys.treeAddress1;
    const treeAuthority1: PublicKey = keys.treeAuthority1;
    const treeAddress2: PublicKey = keys.treeAddress2;
    const treeAuthority2: PublicKey = keys.treeAuthority2;
    const collectionMint: PublicKey = keys.collectionMint;
    const collectionMetadataAccount: PublicKey = keys.collectionMetadataAccount;
    const collectionMasterEditionAccount: PublicKey = keys.collectionMasterEditionAccount;

    await mintNft(payer, metaplex, collectionMint, 6)
    await mintNft(payer, metaplex, collectionMint, 7)
    await mintCompressedNft(payer, connection, treeAddress1,
        treeAuthority1, collectionMint, collectionMetadataAccount, collectionMasterEditionAccount, 8)
    await mintCompressedNft(payer, connection, treeAddress1,
        treeAuthority1, collectionMint, collectionMetadataAccount, collectionMasterEditionAccount, 9)
    await mintCompressedNft(payer, connection, treeAddress2,
        treeAuthority2, collectionMint, collectionMetadataAccount, collectionMasterEditionAccount, 10)

})();