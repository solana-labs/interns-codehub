import {
    MetadataArgs,
    PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
    createMintToCollectionV1Instruction,
} from "@metaplex-foundation/mpl-bubblegum";
import {
    SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import { createMint } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

export async function mintCompressedNft(
    connection: Connection,
    payer: Keypair,
    treeAddress: PublicKey,
    treeAuthority: PublicKey,
    collectionMint: PublicKey,
    collectionMetadataAccount: PublicKey,
    collectionMasterEditionAccount: PublicKey,
    compressedNftMetadata: MetadataArgs,
    receiverAddress: PublicKey
) {
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
                collection: { key: collectionMint, verified: false }, //TODO: verify nft
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
        return txSig;
    } catch (e) {
        console.error(e);
        throw e;
    }
    
}
