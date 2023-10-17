import fs from "fs";
import Arweave from "arweave";
import { Keypair } from "@solana/web3.js";

(async () => {
  const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
    timeout: 20000,
    logging: false,
  });

  // Upload image to Arweave
  const data = fs.readFileSync("./nfts/boxing-gloves.jpeg");

  const transaction = await arweave.createTransaction({
    data: data,
  });

  transaction.addTag("Content-Type", "image/jpeg");
  // const wallet = await arweave.wallets.generate();
  // console.log("wallet", wallet);
  const wallet = JSON.parse(fs.readFileSync("../keys/arweave-private.json", "utf-8"));

  // console.log("wallet", wallet);
  await arweave.transactions.sign(transaction, wallet);

  const response = await arweave.transactions.post(transaction);
  console.log(response);

  const id = transaction.id;
  const imageUrl = id ? `https://arweave.net/${id}` : undefined;
  console.log("imageUrl", imageUrl);

  // Upload metadata to Arweave

  const metadata = {
    name: "Varun Custom NFT #1",
    symbol: "CNFT",
    description: "This is a boxing glove NFT, created by Varun. I love it, cus these are the gloves I used to knock out Mike Tyson.",
    seller_fee_basis_points: 500,
    // external_url: "https://www.customnft.com/",
    attributes: [
      {
        trait_type: "NFT type",
        value: "Custom",
      },
    ],
    collection: {
      name: "Test Collection",
      family: "Custom NFTs",
    },
    properties: {
      files: [
        {
          uri: imageUrl,
          type: "image/png",
        },
      ],
      category: "image",
      maxSupply: 0,
      creators: [
        {
          address: "8rcvXRDktcqzNZ9N1iDAptYky93HuZvbzs76ZFXPmKQs",
          share: 100,
        },
      ],
    },
    image: imageUrl,
  };

  const metadataRequest = JSON.stringify(metadata);

  const metadataTransaction = await arweave.createTransaction({
    data: metadataRequest,
  });

  metadataTransaction.addTag("Content-Type", "application/json");

  await arweave.transactions.sign(metadataTransaction, wallet);

  console.log("metadata txid", metadataTransaction.id);

  console.log(await arweave.transactions.post(metadataTransaction));
})();
