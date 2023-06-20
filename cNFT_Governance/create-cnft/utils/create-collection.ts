import { Keypair, Connection, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAccount, createMint, mintTo } from "@solana/spl-token";
import { savePublicKeyToFile } from "./helper";

import {
    PublicKey,
} from "@metaplex-foundation/js";

import { 
    CreateMetadataAccountArgsV3,
    PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
    createCreateMasterEditionV3Instruction,
    createCreateMetadataAccountV3Instruction,
    createSetCollectionSizeInstruction,
} from "@metaplex-foundation/mpl-token-metadata";

export async function createCollection(
    connection: Connection,
    payer: Keypair,
    metadataV3: CreateMetadataAccountArgsV3
) {
    console.log("Start creating collection: ", metadataV3.data.name);

    // create mint account for nft collection
    const mint = await createMint(
        connection,
        payer,
        payer.publicKey, // mintAuthority
        payer.publicKey, // freezeAuthority
        0 // collection -> decimal == 0
    )
    console.log("collection mint address:", mint.toBase58())

     // create the token account ??? not sure why need this
    console.log("Creating a token account...");
    const tokenAccount = await createAccount(
        connection,
        payer,
        mint,
        payer.publicKey,
        // undefined, undefined,
    );
    console.log("Token account:", tokenAccount.toBase58());
    console.log("Minting 1 token for the collection...");
    await mintTo(connection, payer, mint, tokenAccount, payer, 1, [],  undefined, TOKEN_PROGRAM_ID);

    // create account for storing collection metadata
    const [metadataAccount, _bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata", "utf8"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID,
    )
    console.log("collection metadata address:", metadataAccount.toBase58())
    
    const createMetadataIx = createCreateMetadataAccountV3Instruction(
        {
            metadata: metadataAccount,
            mint: mint,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            updateAuthority: payer.publicKey,
        },
        {
            createMetadataAccountArgsV3: metadataV3,
        }
    )

    // create account for showing supply of collection metadata, the proof of the Non-Fungible of the token
    const [masterEditionAccount, _bump2] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata", "utf8"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from("edition", "utf8")],
        TOKEN_METADATA_PROGRAM_ID,
    )
    console.log("collection edition address:", metadataAccount.toBase58())
    
    const createMasterEditionIx = createCreateMasterEditionV3Instruction(
        {
            edition: masterEditionAccount,
            payer: payer.publicKey,
            mint: mint,
            mintAuthority: payer.publicKey,
            updateAuthority: payer.publicKey,
            metadata: metadataAccount,
        },
        {
            createMasterEditionArgs: {
                maxSupply: 0,
            }
        }
    )

    // create collection size
    const collectionSizeIx = createSetCollectionSizeInstruction(
        {
            collectionMetadata: metadataAccount,
            collectionAuthority: payer.publicKey,
            collectionMint: mint,
        },
        {
            setCollectionSizeArgs: { size: 11 }
        }
    )

    try{
        const tx = new Transaction();
        tx.add(createMetadataIx);
        tx.add(createMasterEditionIx);
        tx.add(collectionSizeIx);

        tx.feePayer = payer.publicKey;
        // tx.sign(payer); ??

        const txSig = await sendAndConfirmTransaction(
            connection,
            tx,
            [payer],
            {
                commitment: "confirmed",
                skipPreflight: true //?
            }
        )
    } catch (e) {
        console.error("\nFailed to create collection:", e);
        throw e;
    }
    savePublicKeyToFile("collectionMint", mint);
    savePublicKeyToFile("collectionMetadataAccount", metadataAccount);
    savePublicKeyToFile("collectionMasterEditionAccount", masterEditionAccount);
    return { mint, metadataAccount, masterEditionAccount };

}
