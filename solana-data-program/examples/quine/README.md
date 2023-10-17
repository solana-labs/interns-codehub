# Quine

This example showcases how a NFT stored fully on-chain using the Data Program can have its image and JSON metadata be modified via an on-chain program

## End Goal

- An NFT that displays a [Quine sphere](https://github.com/nvsriram/quine) with JSON metadata which is stored fully on-chain
- The JSON metadata has attribute values updated via an on-chain instruction
- The JSON metadata has new attributes added via on-chain instruction
- The quine sphere color changes based on when the on-chain instruction is called

## Getting Started

1. Clone the example and navigate to the `program` directory
2. Compile the Rust program using: `cargo-build-sbf`
3. Deploy the Rust program using: `solana program deploy target/deploy/quineprogram.so`. <br />
   <b>Note down the program ID of the deployed program</b>
4. Navigate to the `js` directory and install all dependencies using `npm install`
5. Copy the `quine.html` file from this [repo](https://github.com/nvsriram/quine) and upload it on a Data Account using [SolD](https://sold-website.vercel.app/upload) <b>\*</b>
6. Make sure the authority is set to a wallet you own as you will require its private key later on
7. In the `meta.json` file, replace the two occurrences of `<REPLACE WITH QUINE.HTML DATA ACCOUNT PUBKEY>` with the `PublicKey` of the HTML Data Account
8. Save the changes to the `meta.json` file and upload it using [SolD](https://sold-website.vercel.app/upload)
9. In the `index.ts` file, update the `quineSphere` and `quineMetadata` values with the HTML Data Account `PublicKey` and the JSON Data Account `PublicKey` respectively
10. Update `metadataUpdateOffset` on line#68 of `index.ts` with the offset of the first attribute's value i.e., `metadataUpdateOffset` is the minified JSON string length from the start until:

```
{"name":"Quine NFT","symbol":"" . . . "attributes":[{"trait_type":"Dynamic?","value":"
```

11. Update `metadataEndOffset` on line#104 of `index.ts` with the offset from the attributes array's closing bracket i.e., `metadataEndOffset` is the minified JSON string length till the end from:

```
],"properties":{"files":[{"uri": . . . "type":"image/svg+xml"}],"category":"image"}}
```

12. Create a `.env` file and add the following to it:

```
CONNECTION_URL=https://api.devnet.solana.com # if deployed on devnet
CLUSTER=devnet # if deployed on devnet
QUINE_PROGRAM_ID=<REPLACE WITH PROGRAM ID OF THE DEPLOYED RUST PROGRAM>
AUTHORITY_PRIVATE=<REPLACE WITH PRIVATE KEY OF AUTHORITY WALLET>
BASE_URL=https://sold-website.vercel.app
DATA_ROUTE=/api/data/
```

13. Run `npx ts-node src/index.ts`. This will:
    1. Mint the quine NFT
    2. Update the attribute value in the JSON metadata from `no` to `si`
    3. Add a new attribute to the JSON metadata
    4. Change the color of the quine sphere based on when the program was called
14. You can view the minted NFT to view the changes

You now have a dynamic quine NFT that is stored fully on-chain that can have its JSON metadata and image be modified via an on-chain program! ;)

<b>\*</b><small><i> You can upload the file manually too but the website just makes it easier </i></small>
