import { Keypair, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
    ValidDepthSizePair,
    createAllocTreeIx,
    SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    SPL_NOOP_PROGRAM_ID
} from "@solana/spl-account-compression";

import {
    PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
    createCreateTreeInstruction,
} from "@metaplex-foundation/mpl-bubblegum";
import { savePublicKeyToFile } from "../utils/helper";
import dotenv from "dotenv";
dotenv.config();

export interface MerkleTreeArgs {
    maxDepth: number
    maxBufferSize: number
    canopyHeight: number
}

export async function createTree(
    payer: Keypair,
    connection: Connection,
    treeNumber: number | null,
    maxDepthSizePair: ValidDepthSizePair
) {
    const treeKeypair = Keypair.generate();
    const canopyDepth = maxDepthSizePair.maxDepth - 1;

    const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
        [treeKeypair.publicKey.toBuffer()],
        BUBBLEGUM_PROGRAM_ID,
    )

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

    try {
        const tx = new Transaction();
        tx.add(allocTreeIx);
        tx.add(createTreeIx);
        tx.feePayer = payer.publicKey;

        await sendAndConfirmTransaction(
            connection,
            tx,
            [payer, treeKeypair],
            { skipPreflight: true, commitment: "confirmed" });

    } catch (e) {
        console.error(e);
        throw e;
    }
    savePublicKeyToFile(`treeAddress${treeNumber}`, treeKeypair.publicKey);
    savePublicKeyToFile(`treeAuthority${treeNumber}`, treeAuthority);
    console.log(`Tree Address${treeNumber}: `, treeKeypair.publicKey.toBase58());
    return { treeAddress: treeKeypair.publicKey, treeAuthority }
}