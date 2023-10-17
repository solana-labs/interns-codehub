const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
  NONCE_ACCOUNT_LENGTH,
} = require("@solana/web3.js");

const {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getMint,
  createMint,
  mintTo,
  approveChecked,
  TOKEN_PROGRAM_ID,
  AccountLayout,
  transferChecked,
  transfer,
} = require("@solana/spl-token");

const BN = require("bn.js");

const main = async () => {
  const connection = new Connection("https://api.devnet.solana.com/");

  const feePayer = new Keypair();
  const feePayer_pk = feePayer.publicKey;
  const feePayer_sk = feePayer.secretKey;
  console.log("feePayer: ");
  console.log("pk: ", feePayer_pk);
  console.log("sk: ", feePayer_sk);
  console.log("\n");

  const g1 = new Keypair();
  const g1_pk = g1.publicKey;
  const g1_sk = g1.secretKey;
  console.log("Guard 1: ");
  console.log("pk: ", g1_pk);
  console.log("sk: ", g1_sk);
  console.log("\n");

  const g2 = new Keypair();
  const g2_pk = g2.publicKey;
  const g2_sk = g2.secretKey;
  console.log("Guard 2: ");
  console.log("pk: ", g2_pk);
  console.log("sk: ", g2_sk);
  console.log("\n");

  const g3 = new Keypair();
  const g3_pk = g3.publicKey;
  const g3_sk = g3.secretKey;
  console.log("Guard 3: ");
  console.log("pk: ", g3_pk);
  console.log("sk: ", g3_sk);
  console.log("\n");

  const executor = new Keypair();
  const executor_pk = executor.publicKey;
  const executor_sk = executor.secretKey;
  console.log("executor: ");
  console.log("pk: ", executor_pk);
  console.log("sk: ", executor_sk);

  const newfeePayer = new Keypair();
  const newfeePayer_pk = newfeePayer.publicKey;
  const newfeePayer_sk = newfeePayer.secretKey;
  console.log("newfeePayer: ");
  console.log("pk: ", newfeePayer_pk);
  console.log("sk: ", newfeePayer_sk);
  console.log("\n");

  const mintAuthority = new Keypair();
  const mintAuthority_pk = mintAuthority.publicKey;
  const mintAuthority_sk = mintAuthority.secretKey;
  console.log("mintAuthority: ");
  console.log("pk: ", mintAuthority_pk);
  console.log("sk: ", mintAuthority_sk);
  console.log("\n");


  console.log("\nRequesting Airdrop of 2 SOL to fee payer...");
  const signature = await connection.requestAirdrop(feePayer.publicKey, 2e9);
  await connection.confirmTransaction(signature, "finalized");
  console.log("Airdrop received");

  console.log("\nRequesting Airdrop of 2 SOL to executor...");
  const signature1 = await connection.requestAirdrop(
    executor.publicKey,
    2e9
  );
  await connection.confirmTransaction(signature1, "finalized");
  console.log("Airdrop received");

  console.log("\nRequesting Airdrop of 2 SOL to new fee payer...");
  const signature2 = await connection.requestAirdrop(
    newfeePayer.publicKey,
    2e9
  );
  await connection.confirmTransaction(signature2, "finalized");
  console.log("Airdrop received");

  console.log("Minting new token...");
  const freezeAuthority = Keypair.generate();
  const customMint = await createMint(
    connection,
    feePayer,
    mintAuthority.publicKey,
    freezeAuthority.publicKey,
    9
    // Keypair.generate(),
    // { skipPreflight: true, commitment: "finalized" }
  );
  console.log("Mint: " + customMint.toBase58() + "\n");
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
