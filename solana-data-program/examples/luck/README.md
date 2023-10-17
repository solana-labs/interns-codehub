# Luck

This example showcases how a NFT stored fully on-chain using the Data Program can be modified via an on-chain program

## End Goal

An NFT that displays a number that can be changed via an on-chain program that either increases it by 1 or resets it to 0 with a 50% probability

## Getting Started

1. Clone the example and navigate to the `program` directory
2. Compile the Rust program using: `cargo-build-sbf`
3. Deploy the Rust program using: `solana program deploy target/deploy/luckprogram.so`. <br />
   <b>Note down the program ID of the deployed program</b>
4. Navigate to the `js` directory and install all dependencies using `npm install`
5. Upload the `luck.html` file on a Data Account using [SolD](https://sold-website.vercel.app/upload) <b>\*</b>
6. Make sure the authority is set to a wallet you own as you will require its private key later on
7. In the `meta.json` file, replace the two occurrences of `<REPLACE WITH LUCK.HTML DATA ACCOUNT PUBKEY>` with the `PublicKey` of the HTML Data Account
8. Save the changes to the `meta.json` file and upload it using [SolD](https://sold-website.vercel.app/upload)
9. In the `index.ts` file, update the `luckImage` and `luckMetadata` values with the HTML Data Account `PublicKey` and the JSON Data Account `PublicKey` respectively
10. Create a `.env` file and add the following to it:

```
CONNECTION_URL=https://api.devnet.solana.com # if deployed on devnet
CLUSTER=devnet # if deployed on devnet
LUCK_PROGRAM_ID=<REPLACE WITH PROGRAM ID OF THE DEPLOYED RUST PROGRAM>
AUTHORITY_PRIVATE=<REPLACE WITH PRIVATE KEY OF AUTHORITY WALLET>
BASE_URL=https://sold-website.vercel.app
DATA_ROUTE=/api/data/
```

11. when running for the first time, run `npx ts-node src/index.ts --mint` to mint the NFT and run the on-chain program to update it
12. After the NFT is minted, you can run `npx ts-node src/index.ts` (without the --mint flag) to just run the on-chain program and test your luck!
13. You can view the minted NFT to see that the number change

You now have a dynamic NFT that is stored fully on-chain that can be modified via an on-chain program! ;)

<b>\*</b><small><i> You can upload the file manually too but the website just makes it easier </i></small>
