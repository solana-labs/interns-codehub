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
  transfer,
} = require("@solana/spl-token");

const BN = require("bn.js");

//const MINT_ADDR = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const TRANSFER_AMOUNT = 1;
const mint_pk = new PublicKey('Aj7HtywN3kaCHw4KTKCthMNWRAZvYE79vw7tm7YhtkpG');

const main = async () => {
  const args = process.argv.slice(2);
  const programId = new PublicKey(args[0]);

  const connection = new Connection("https://api.devnet.solana.com/");

  const feePayer = new Keypair();
  const destAccount = new Keypair();

  console.log("Requesting Airdrop of 2 MINT...");
  const signature = await connection.requestAirdrop(feePayer.publicKey, 3e9);
  await connection.confirmTransaction(signature, "finalized");
  console.log("Airdrop received");

  console.log("Requesting Airdrop of 2 MINT to dest...");
  const signature2 = await connection.requestAirdrop(
    destAccount.publicKey,
    2e9
  );
  await connection.confirmTransaction(signature2, "finalized");
  console.log("Airdrop received");

  // instr 1: initialize social recovery wallet
  const idx = Buffer.from(new Uint8Array([0]));
  const acct_len = Buffer.from(new Uint8Array(new BN(3).toArray("le", 1)));
  const recovery_threshold = Buffer.from(
    new Uint8Array(new BN(3).toArray("le", 1))
  );

  const profile_pda = PublicKey.findProgramAddressSync(
    [Buffer.from("profile", "utf-8"), feePayer.publicKey.toBuffer()],
    programId
  );

  const guard1 = new Keypair();
  const guard2 = new Keypair();
  const guard3 = new Keypair();
  const nonceAccount = new Keypair();

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

  /** Instr 7: transfer */

  // Mint new token
  console.log("Mint new token");
  const mintAuthority = Keypair.generate();
  const freezeAuthority = Keypair.generate();
  const customMint = await createMint(
    connection,
    feePayer,
    mintAuthority.publicKey,
    freezeAuthority.publicKey,
    9,
    Keypair.generate(),
    { skipPreflight: true }
  );
  console.log(`Custom Mint: ${customMint}`);

  // Step 1
  console.log(
    `Sending ${TRANSFER_AMOUNT} from ${feePayer.publicKey.toString()} to ${destAccount.publicKey.toString()}`
  );
  console.log("1 - Getting Source Token Account");
  const balance = await connection.getBalance(feePayer.publicKey);
  console.log(`Src Balance: ${balance}`);
  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    customMint,
    feePayer.publicKey
  );

  const dele = new Keypair();
  console.log("Requesting Airdrop of 2 MINT to delegate...");
  const signature3 = await connection.requestAirdrop(
    dele.publicKey,
    2e9
  );
  await connection.confirmTransaction(signature3, "finalized");
  console.log("Airdrop received");
  // set delegate
  await approveChecked(
    connection, // connection
    feePayer, // fee payer
    customMint, // mint
    senderTokenAccount.address, // token account
    dele.publicKey, // delegate
    feePayer, // owner of token account
    10e9, // amount, if your deciamls is 8, 10^8 for 1 token
    9 // decimals
  );

  // Step 2
  console.log("2 - Getting Destination Token Account");
  const balanceDest = await connection.getBalance(destAccount.publicKey);
  console.log(`Dest Balance: ${balanceDest}`);
  const destTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    customMint,
    destAccount.publicKey
  );

  console.log("Token Accounts Created");

  //   const transfertoSender = SystemProgram.transfer({
  //     fromPubkey: feePayer.publicKey,
  //     toPubkey: senderTokenAccount.address,
  //     lamports: 1e9,
  //   });

  await mintTo(
    connection,
    feePayer,
    customMint,
    senderTokenAccount.address,
    mintAuthority,
    6e9 // because decimals for the mint are set to 9
    //[],
    //{skipPreflight: true},
  );

  // Verify mint info
  const mintInfo = await getMint(connection, customMint);
  console.log("Mint info: ", mintInfo.supply.toString());

  const transferIx = createTransferCheckedInstruction(
    senderTokenAccount.address,
    customMint,
    destTokenAccount.address,
    feePayer.publicKey,
    5e8,
    9
  );

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
  console.log("\ninitialize nonce transaction:");
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

  // Transaction 2: transfer
  tx = new Transaction();
  tx.add(initializeSocialWalletIx).add(transferIx);

  txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    confirmation: "confirmed",
  });

  const senderTokenAccountBalance = await connection.getTokenAccountBalance(
    senderTokenAccount.address
  );
  const destTokenAccountBalance = await connection.getTokenAccountBalance(
    destTokenAccount.address
  );
  console.log(
    `Sender Token Account Balance: ${senderTokenAccountBalance.value.amount}`
  );
  console.log(
    `Receiver Token Account Balance: ${destTokenAccountBalance.value.amount}`
  );

  console.log("\nTransfer mint: ");
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

  // Transaction 3: recover wallet
  const newFeePayer = new Keypair();
  const idx1 = Buffer.from(new Uint8Array([5]));
  const new_acct_len = Buffer.from(new Uint8Array(new BN(3).toArray("le", 1)));

  console.log("\nRequesting Airdrop of 2 SOL to new fee payer...");
  const signature1 = await connection.requestAirdrop(
    newFeePayer.publicKey,
    2e9
  );
  await connection.confirmTransaction(signature1, "finalized");
  console.log("Airdrop received");

  const new_profile_pda = await PublicKey.findProgramAddress(
    [Buffer.from("profile", "utf-8"), newFeePayer.publicKey.toBuffer()],
    programId
  );

  const recoverWalletIx = new TransactionInstruction({
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
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: newFeePayer.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: guard1.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: guard2.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: guard3.publicKey,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId,
    data: Buffer.concat([idx1, new_acct_len]),
  });

  tx = new Transaction();
  tx.add(recoverWalletIx);

  let res = await connection.getTokenAccountsByOwner(feePayer.publicKey, {
    programId: TOKEN_PROGRAM_ID,
  });
  res.value.forEach(async (e) => {
    const oldTokenAccount = e.pubkey.toBase58();
    console.log(`pubkey: ${oldTokenAccount}`);
    const accountInfo = AccountLayout.decode(e.account.data);

    const mint = new PublicKey(accountInfo.mint);
    const amount = accountInfo.amount;
    const delegate = accountInfo.delegate;
    console.log(`mint: ${mint}`);
    console.log(`amount: ${amount}`);
    console.log(`delegate: ${delegate}`);

    const newTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      newFeePayer,
      mint,
      newFeePayer.publicKey
    );

    // await transfer(
    //   connection,
    //   feePayer,
    //   oldT
    // )

    const transferIx = createTransferCheckedInstruction(
      new PublicKey(oldTokenAccount),
      mint,
      newTokenAccount.address,
      delegate,
      3,
      9
    );
    tx.add(transferIx);
  });

  txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer, newFeePayer, guard1, guard2, guard3],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    }
  );

  console.log("\nRecover Wallet: ");
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
