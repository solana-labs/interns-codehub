const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} = require("@solana/web3.js");

const BN = require("bn.js");

const main = async () => {
  var args = process.argv.slice(2);
  const programId = new PublicKey(args[0]);

  const connection = new Connection("https://api.devnet.solana.com/");

  const feePayer = new Keypair();
  const executor = new Keypair();

  console.log("Requesting Airdrop of 1 SOL...");
  await connection.requestAirdrop(feePayer.publicKey, 2e9);
  console.log("Airdrop received");

  // instr 1: initialize social recovery wallet
  const idx = Buffer.from(new Uint8Array([0]));
  const acct_len = Buffer.from(new Uint8Array(new BN(3).toArray("le", 1)));
  const recovery_threshold = Buffer.from(
    new Uint8Array(new BN(3).toArray("le", 1))
  );
  //const usdc_pk = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  let profile_pda = await PublicKey.findProgramAddress(
    [Buffer.from("profile", "utf-8"), feePayer.publicKey.toBuffer()],
    programId
  );

  const guard1 = new Keypair();
  const guard2 = new Keypair();
  const guard3 = new Keypair();

  let initializeSocialWalletIx = new TransactionInstruction({
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
    programId: programId,
    data: Buffer.concat([idx, acct_len, recovery_threshold]),
  });

  // Instr 2 (2.1) Add
  const idx1 = Buffer.from(new Uint8Array([1]));
  const guard4 = new Keypair();
  const new_acct_len = Buffer.from(new Uint8Array(new BN(1).toArray("le", 1)));

  let addToRecoveryListIx = new TransactionInstruction({
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
        pubkey: guard4.publicKey,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx1, new_acct_len]),
  });

  // Instr 3 (2.2) Modify
  const idx2 = Buffer.from(new Uint8Array([2]));
  const replaced = new Keypair();
  const new_acct_len1 = Buffer.from(new Uint8Array(new BN(1).toArray("le", 1)));

  let modifyRecoveryIx = new TransactionInstruction({
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
        pubkey: guard3.publicKey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: replaced.publicKey,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx2, new_acct_len1]),
  });

  // Instr 4 (2.3) Delete
  const idx3 = Buffer.from(new Uint8Array([3]));
  const new_acct_len2 = Buffer.from(new Uint8Array(new BN(1).toArray("le", 1)));

  let deleteFromRecoveryIx = new TransactionInstruction({
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
        pubkey: guard1.publicKey,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx3, new_acct_len2]),
  });

  // Instr 5 (2.4) Modify threshold
  const idx4 = Buffer.from(new Uint8Array([4]));
  const new_threshold = Buffer.from(new Uint8Array(new BN(3).toArray("le", 1)));

  let modifyRecoveryThresholdIx = new TransactionInstruction({
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
    ],
    programId: programId,
    data: Buffer.concat([idx4, new_threshold]),
  });

  // Instr 6 (3) recover wallet
  const idx5 = Buffer.from(new Uint8Array([5]));
  const new_acct_len3 = Buffer.from(new Uint8Array(new BN(3).toArray("le", 1)));
  const newFeePayer = new Keypair();

  console.log("Requesting Airdrop of 1 SOL to new fee payer...");
  await connection.requestAirdrop(newFeePayer.publicKey, 2e9);
  console.log("Airdrop received");

  let new_profile_pda = await PublicKey.findProgramAddress(
    [Buffer.from("profile", "utf-8"), newFeePayer.publicKey.toBuffer()],
    programId
  );

  let recoverWalletIx = new TransactionInstruction({
    keys: [
      {
        pubkey: profile_pda[0],
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new_profile_pda[0],
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: newFeePayer.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: executor.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: guard2.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: replaced.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: guard4.publicKey,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx5, new_acct_len3]),
  });

  let tx = new Transaction();
  tx.add(initializeSocialWalletIx)
    .add(addToRecoveryListIx)
    .add(modifyRecoveryIx)
    .add(deleteFromRecoveryIx)
    .add(modifyRecoveryThresholdIx)
    .add(recoverWalletIx);

  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer, guard2, replaced, guard4, newFeePayer],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    }
  );
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
