import { 
    ValidDepthSizePair, 
    createAllocTreeIx,
    SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    SPL_NOOP_PROGRAM_ID
} from "@solana/spl-account-compression";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

import {
    PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
    createCreateTreeInstruction,
} from "@metaplex-foundation/mpl-bubblegum";
import { savePublicKeyToFile } from "./helper";

export async function createMerkleTree(
    connection: Connection,
    payer: Keypair,
    treeKeypair: Keypair,
) {
    console.log("Start creating merkle tree");
    console.log("merkle tree address:", treeKeypair.publicKey.toBase58());
    const maxDepthSizePair: ValidDepthSizePair = {
        maxDepth: 5,
        maxBufferSize: 8,
    };
    const canopyDepth = maxDepthSizePair.maxDepth - 1;

    const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
        [treeKeypair.publicKey.toBuffer()],
        BUBBLEGUM_PROGRAM_ID,
    )
    console.log("merkle tree authority:", treeAuthority.toBase58());

    // allocate space for tree account instruction
    const allocTreeIx = await createAllocTreeIx(
        connection,
        treeKeypair.publicKey,
        payer.publicKey,
        maxDepthSizePair,
        canopyDepth
    )

    // create tree
    const createTreeIx = createCreateTreeInstruction(
        {
            payer: payer.publicKey,
            treeCreator: payer.publicKey,
            treeAuthority: treeAuthority,
            merkleTree: treeKeypair.publicKey,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
            logWrapper: SPL_NOOP_PROGRAM_ID
        },
        {
            maxBufferSize: maxDepthSizePair.maxBufferSize,
            maxDepth: maxDepthSizePair.maxDepth,
            public: false,
        },
        BUBBLEGUM_PROGRAM_ID
    )

    try{
        const tx = new Transaction();
        tx.add(allocTreeIx);
        tx.add(createTreeIx);
        tx.feePayer = payer.publicKey;

        const txSig = await sendAndConfirmTransaction(
            connection,
            tx, 
            [payer, treeKeypair], 
            {skipPreflight: true, commitment: "confirmed"});
        
        console.log("\nMerkle tree created successfully!");
        console.log("Transaction signature: ", txSig);
    } catch (e) {
        console.error(e);
        throw e;
    }
    savePublicKeyToFile("treeAddress", treeKeypair.publicKey);
    savePublicKeyToFile("treeAuthority", treeAuthority);
    return {treeAuthority, treeAddress: treeKeypair.publicKey}
}