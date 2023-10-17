const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
  NONCE_ACCOUNT_LENGTH
} = require('@solana/web3.js')

const {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  createSyncNativeInstruction,
} = require('@solana/spl-token')

const BN = require('bn.js')

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const TRANSFER_AMOUNT = 1
const sol_pk = new PublicKey(SOL_MINT)

const main = async () => {
  const args = process.argv.slice(2)
  const programId = new PublicKey(args[0])

  const connection = new Connection('https://api.devnet.solana.com/')

  const fromWallet = new Keypair()
  const destWallet = new Keypair()

  console.log('Requesting Airdrop of 2 SOL...')
  const signature = await connection.requestAirdrop(fromWallet.publicKey, 2e9)
  await connection.confirmTransaction(signature, 'finalized')
  console.log('Airdrop received')

  console.log('Requesting Airdrop of 2 SOL to dest...')
  const signature2 = await connection.requestAirdrop(destWallet.publicKey, 2e9)
  await connection.confirmTransaction(signature2, 'finalized')
  console.log('Airdrop received')

  // instr 1: initialize social recovery wallet
  const idx = Buffer.from(new Uint8Array([0]))
  const acct_len = Buffer.from(new Uint8Array(new BN(3).toArray('le', 1)))
  const recovery_threshold = Buffer.from(
    new Uint8Array(new BN(3).toArray('le', 1))
  )

  const profile_pda = PublicKey.findProgramAddressSync(
    [Buffer.from('profile', 'utf-8'), fromWallet.publicKey.toBuffer()],
    programId
  )

  const guard1 = new Keypair()
  const guard2 = new Keypair()
  const guard3 = new Keypair()
  const nonceAccount = new Keypair()

  const initializeSocialWalletIx = new TransactionInstruction({
    keys: [
      {
        pubkey: profile_pda[0],
        isSigner: false,
        isWritable: true
      },
      {
        pubkey: fromWallet.publicKey,
        isSigner: true,
        isWritable: true
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false
      },
      {
        pubkey: guard1.publicKey,
        isSigner: false,
        isWritable: false
      },
      {
        pubkey: guard2.publicKey,
        isSigner: false,
        isWritable: false
      },
      {
        pubkey: guard3.publicKey,
        isSigner: false,
        isWritable: false
      }
    ],
    programId,
    data: Buffer.concat([idx, acct_len, recovery_threshold])
  })

  /** Instr 7: transfer */
  // Step 1
  console.log(
    `Sending ${TRANSFER_AMOUNT} ${SOL_MINT} from ${fromWallet.publicKey.toString()} to ${destWallet.publicKey.toString()}`
  )
  console.log('1 - Getting Source Token Account')
  const balance = await connection.getBalance(destWallet.publicKey)
  console.log(`Src Balance: ${balance}`)
  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    sol_pk,
    fromWallet.publicKey
  )

  // Step 2
  console.log('2 - Getting Destination Token Account')
  const balanceDest = await connection.getBalance(destWallet.publicKey)
  console.log(`Dest Balance: ${balanceDest}`)
  const destTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    sol_pk,
    destWallet.publicKey
  )

  console.log('Token Accounts Created')

  const transferSOLtoSender =
    SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey: senderTokenAccount.address,
      lamports: 1e9
    })

  const transferIx = createTransferCheckedInstruction(
    senderTokenAccount.address,
    sol_pk,
    destTokenAccount.address,
    fromWallet.publicKey,
    5e8,
    9
  )

  // Transaction 1: setup nonce
  let tx = new Transaction();
  tx.add(
    // create nonce account
    SystemProgram.createAccount({
      fromPubkey: fromWallet.publicKey,
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
      authorizedPubkey: fromWallet.publicKey, // nonce account auth
    })
  );
  tx.feePayer = fromWallet.publicKey;

  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [fromWallet, nonceAccount],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    }
  );
  console.log("initialize nonce transaction:");
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

  // Transaction 2: transfer
  tx = new Transaction()
  tx.add(initializeSocialWalletIx)
    .add(transferSOLtoSender)
    .add(createSyncNativeInstruction(senderTokenAccount.address))
    .add(transferIx)

  txid = await sendAndConfirmTransaction(connection, tx, [fromWallet], {
    skipPreflight: true,
    preflightCommitment: 'confirmed',
    confirmation: 'confirmed'
  })

  const senderTokenAccountBalance = await connection.getTokenAccountBalance(
    senderTokenAccount.address
  )
  const destTokenAccountBalance = await connection.getTokenAccountBalance(
    destTokenAccount.address
  )
  console.log(`Sender Token Account Balance: ${senderTokenAccountBalance}`)
  console.log(`Receiver Token Account Balance: ${destTokenAccountBalance}`)

  console.log('Transfer sol: ');
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`)
}

main()
  .then(() => {
    console.log('Success')
  })
  .catch((e) => {
    console.error(e)
  })
