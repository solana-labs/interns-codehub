const { Keypair } = require("@solana/web3.js");

const main = async () => {
  const key1 = new Keypair();
  console.log("key1: ");
  console.log("pk: ", key1.publicKey);
  console.log("sk: ", key1.secretKey);
  console.log("\n");

  const key2 = new Keypair();
  console.log("key2: ");
  console.log("pk: ", key2.publicKey);
  console.log("sk: ", key2.secretKey);
  console.log("\n");

  const key3 = new Keypair();
  console.log("key3: ");
  console.log("pk: ", key3.publicKey);
  console.log("sk: ", key3.secretKey);
  console.log("\n");
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
