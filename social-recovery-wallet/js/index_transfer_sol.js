const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  NonceInformation,
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
  closeAccount,
  createSyncNativeInstruction,
} = require("@solana/spl-token");

const BN = require("bn.js");

const feePayer_sk = new Uint8Array([
  106, 239, 158, 103, 197, 210, 91, 64, 112, 50, 190, 210, 69, 58, 113, 130,
  168, 199, 156, 103, 186, 170, 85, 248, 149, 123, 203, 109, 98, 129, 140, 45,
  131, 193, 148, 111, 29, 124, 161, 112, 165, 212, 174, 108, 106, 188, 96, 114,
  158, 16, 122, 70, 49, 145, 128, 123, 155, 213, 214, 67, 186, 75, 46, 174,
]);

const executor_sk = new Uint8Array([
  213, 232, 40, 111, 241, 184, 226, 226, 140, 20, 21, 24, 109, 22, 99, 150, 135,
  70, 81, 93, 51, 11, 229, 255, 142, 32, 124, 39, 164, 83, 1, 242, 133, 233,
  209, 254, 108, 33, 240, 70, 39, 51, 103, 167, 195, 205, 112, 102, 121, 93,
  187, 139, 89, 188, 119, 231, 112, 210, 22, 170, 44, 115, 231, 193,
]);

const newFeePayer_sk = new Uint8Array([
  191, 38, 93, 45, 73, 213, 241, 159, 67, 49, 58, 219, 132, 182, 21, 198, 48,
  204, 192, 238, 111, 80, 47, 255, 254, 127, 191, 11, 226, 137, 91, 174, 211,
  115, 44, 26, 220, 41, 19, 221, 16, 251, 226, 133, 54, 204, 193, 213, 152, 234,
  128, 173, 218, 186, 113, 129, 9, 33, 209, 240, 178, 233, 214, 240,
]);

const guard1_sk = new Uint8Array([
  219, 192, 245, 18, 33, 148, 209, 236, 79, 88, 130, 250, 118, 164, 109, 172,
  44, 165, 195, 136, 163, 187, 142, 184, 86, 208, 221, 3, 162, 127, 89, 82, 164,
  161, 91, 84, 42, 199, 40, 204, 137, 172, 179, 152, 212, 17, 58, 31, 149, 133,
  67, 96, 23, 111, 83, 3, 119, 19, 37, 234, 163, 216, 53, 177,
]);

const guard2_sk = new Uint8Array([
  16, 5, 214, 175, 105, 238, 18, 14, 125, 4, 242, 215, 158, 179, 200, 230, 230,
  16, 36, 227, 200, 142, 130, 53, 235, 159, 100, 69, 177, 36, 239, 113, 42, 210,
  117, 85, 113, 159, 206, 119, 128, 70, 103, 49, 182, 66, 56, 157, 83, 23, 35,
  230, 206, 33, 216, 246, 225, 4, 210, 157, 161, 122, 142, 66,
]);

const guard3_sk = new Uint8Array([
  94, 98, 75, 17, 140, 107, 60, 66, 202, 114, 237, 8, 118, 129, 7, 68, 173, 6,
  106, 131, 118, 72, 208, 174, 113, 231, 127, 154, 50, 191, 223, 209, 194, 4,
  95, 55, 179, 216, 90, 90, 229, 27, 131, 112, 116, 110, 129, 176, 218, 139,
  146, 221, 75, 148, 197, 54, 113, 159, 226, 239, 52, 43, 19, 81,
]);

const mintAuthority_sk = new Uint8Array([
  241, 145, 177, 126, 244, 190, 248, 188, 151, 50, 224, 196, 43, 153, 22, 94,
  67, 183, 97, 245, 201, 103, 103, 109, 45, 164, 181, 109, 138, 152, 137, 101,
  163, 141, 201, 165, 214, 152, 171, 237, 175, 1, 228, 183, 81, 244, 27, 10,
  157, 38, 80, 90, 173, 131, 130, 132, 188, 250, 138, 16, 12, 217, 109, 213,
]);

const customMint = new PublicKey(
  "9mMtr7Rx8ajjpRbHmUzb5gjgBLqNtPABdkNiUBAkTrmR"
);

const SOL_MINT = "So11111111111111111111111111111111111111112";
const sol_pk = new PublicKey(SOL_MINT);

const main = async () => {
  const args = process.argv.slice(2);
  const programId = new PublicKey(args[0]);
  const connection = new Connection("https://api.devnet.solana.com/");
  // const connection = new Connection("http://localhost:8899");

  //   const feePayer = new Keypair();
  //   const newFeePayer = new Keypair();
  //   const executor = new Keypair();
  //   const guard1 = new Keypair();
  //   const guard2 = new Keypair();
  //   const guard3 = new Keypair();
  //   const nonceAccount = new Keypair();

  const feePayer = Keypair.fromSecretKey(feePayer_sk);
  const newFeePayer = Keypair.fromSecretKey(newFeePayer_sk);
  const executor = Keypair.fromSecretKey(executor_sk);
  const guard1 = Keypair.fromSecretKey(guard1_sk);
  const guard2 = Keypair.fromSecretKey(guard2_sk);
  const guard3 = Keypair.fromSecretKey(guard3_sk);
  const nonceAccount = new Keypair();
  const mintAuthority = Keypair.fromSecretKey(mintAuthority_sk);
  const destAccount = new Keypair();

  console.log("Requesting Airdrop of 2 SOL to dest...");
  const signature2 = await connection.requestAirdrop(
    destAccount.publicKey,
    2e9
  );
  await connection.confirmTransaction(signature2, "finalized");
  console.log("Airdrop received");

  console.log(`feePayer: ${feePayer.publicKey.toBase58()}`);
  console.log(`newFeePayer: ${newFeePayer.publicKey.toBase58()}`);
  console.log(`executor: ${executor.publicKey.toBase58()}`);
  console.log(`mint: ${customMint.toBase58()}`);

  const profile_pda = PublicKey.findProgramAddressSync(
    [Buffer.from("profile", "utf-8"), feePayer.publicKey.toBuffer()],
    programId
  );
  const new_profile_pda = PublicKey.findProgramAddressSync(
    [Buffer.from("profile", "utf-8"), newFeePayer.publicKey.toBuffer()],
    programId
  );

  console.log(`profile_pda: ${profile_pda[0].toBase58()}`);
  console.log(`new_profile_pda: ${new_profile_pda[0].toBase58()}\n`);

  //   console.log("Requesting Airdrop of 2 SOL...");
  //   const signature = await connection.requestAirdrop(feePayer.publicKey, 1e9);
  //   await connection.confirmTransaction(signature, "finalized");
  //   console.log("Airdrop received");
  //   const balance = await connection.getBalance(feePayer.publicKey);
  //   console.log(`feePayer Balance: ${balance}\n`);

  //   console.log("Requesting Airdrop of 2 SOL to new fee payer...");
  //   const signature1 = await connection.requestAirdrop(
  //     newFeePayer.publicKey,
  //     1e9
  //   );
  //   await connection.confirmTransaction(signature1, "finalized");
  //   console.log("Airdrop received\n");

  //   console.log("Requesting Airdrop of 2 SOL to executor...");
  //   const signature3 = await connection.requestAirdrop(executor.publicKey, 1e9);
  //   await connection.confirmTransaction(signature3, "finalized");
  //   console.log("Airdrop received\n");

  // Mint new token
  //   console.log("Minting new token...");
  //   const mintAuthority = Keypair.generate();
  //   const freezeAuthority = Keypair.generate();
  //   const customMint = await createMint(
  //     connection,
  //     feePayer,
  //     mintAuthority.publicKey,
  //     freezeAuthority.publicKey,
  //     9
  //     // Keypair.generate(),
  //     // { skipPreflight: true, commitment: "finalized" }
  //   );
  //   console.log("Mint: " + customMint.toBase58() + "\n");

  //   console.log("timer started");
  //   await new Promise((resolve) => setTimeout(resolve, 20000));
  //   console.log("waited for 20s\n");

  // instr 1: initialize social recovery wallet
  const idx = Buffer.from(new Uint8Array([0]));
  const acct_len = Buffer.from(new Uint8Array(new BN(3).toArray("le", 1)));
  const recovery_threshold = Buffer.from(
    new Uint8Array(new BN(3).toArray("le", 1))
  );

  const initializeSocialWalletIx = new TransactionInstruction({
    keys: [
      {
        pubkey: profile_pda[0],
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: guard1.publicKey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: guard2.publicKey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: guard3.publicKey,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId,
    data: Buffer.concat([idx, acct_len, recovery_threshold]),
  });

  // Transaction 1: setup nonce
  let tx = new Transaction();
  tx.add(
    // create nonce account
    SystemProgram.createAccount({
      fromPubkey: feePayer.publicKey,
      newAccountPubkey: nonceAccount.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(
        NONCE_ACCOUNT_LENGTH
      ),
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    }),
    // init nonce account
    SystemProgram.nonceInitialize({
      noncePubkey: nonceAccount.publicKey, // nonce account pubkey
      authorizedPubkey: feePayer.publicKey, // nonce account auth
    })
  );
  tx.feePayer = feePayer.publicKey;

  console.log("Sending nonce transaction...");
  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer, nonceAccount],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    }
  );
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet\n`);

  let nonceAccountData = await connection.getNonce(
    nonceAccount.publicKey,
    "confirmed"
  );

  //   // Transaction 3: Initialize wallet
  //   console.log("Initializing social wallet...");
  //   tx = new Transaction();
  //   tx.add(
  //     SystemProgram.nonceAdvance({
  //       noncePubkey: nonceAccount.publicKey,
  //       authorizedPubkey: feePayer.publicKey,
  //     })
  //   ).add(initializeSocialWalletIx);
  //   tx.recentBlockhash = nonceAccountData.nonce;

  //   txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
  //     skipPreflight: true,
  //     preflightCommitment: "confirmed",
  //     confirmation: "confirmed",
  //   });
  //   console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet\n`);

  // Create Token Account for custom mint
  console.log("1 - Getting Source Token Account");
  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    sol_pk,
    profile_pda[0],
    true
  );
  console.log(
    "sender token account: " + senderTokenAccount.address.toBase58() + "\n"
  );

  console.log("2 - Getting Destination Token Account");
  const destTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    sol_pk,
    destAccount.publicKey
  );
  console.log(
    "dest token account: " + destTokenAccount.address.toBase58() + "\n"
  );

  // Sending sol to sender token account (MINTING)
  console.log("Sending SOL to sender token account...");
  const transferSOLtoSender = SystemProgram.transfer({
    fromPubkey: feePayer.publicKey,
    toPubkey: senderTokenAccount.address,
    lamports: 1e9,
  });

  tx = new Transaction();
  tx.add(transferSOLtoSender).add(
    createSyncNativeInstruction(senderTokenAccount.address)
  );
  txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    confirmation: "confirmed",
  });
  console.log("Sent!\n");

  // check sender token account balance after sending
  const senderTokenAccountBalance = await connection.getTokenAccountBalance(
    senderTokenAccount.address
  );
  console.log(
    `Sender Token Account Balance before: ${senderTokenAccountBalance.value.amount}`
  );

  const destTokenAccountBalance = await connection.getTokenAccountBalance(
    destTokenAccount.address
  );
  console.log(
    `Dest Token Account Balance before: ${destTokenAccountBalance.value.amount}\n`
  );

  // Trasnfer SOL
  const amount = 1e9;
  const recoveryMode = 0;
  console.log(`mint: ${customMint}`);
  console.log(`amount: ${amount}`);
  console.log(`recovery mode: ${recoveryMode}\n`);

  const idx2 = Buffer.from(new Uint8Array([6]));
  const amountBuf = Buffer.from(
    new Uint8Array(new BN(amount).toArray("le", 8))
  );
  const recoveryModeBuf = Buffer.from(new Uint8Array([recoveryMode]));
  const transferIx = new TransactionInstruction({
    keys: [
      {
        pubkey: profile_pda[0],
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: senderTokenAccount.address,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: destTokenAccount.address,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId,
    data: Buffer.concat([idx2, amountBuf, recoveryModeBuf]),
  });

  let transferTx = new Transaction();
  transferTx.add(transferIx);

  // transfer and close
  console.log("Transfering...");
  txid = await sendAndConfirmTransaction(connection, transferTx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    confirmation: "confirmed",
  });
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet\n`);
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
