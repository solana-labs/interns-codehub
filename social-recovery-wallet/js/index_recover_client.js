const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction
} = require('@solana/web3.js')

const BN = require('bn.js')

const main = async () => {
  const args = process.argv.slice(2)
  const programId = new PublicKey(args[0])

  const connection = new Connection('https://api.devnet.solana.com/')

  const feePayer = new Keypair()

  console.log('Requesting Airdrop of 1 SOL...')
  await connection.requestAirdrop(feePayer.publicKey, 2e9)
  console.log('Airdrop received')

  // instr 1: initialize social recovery wallet
  const idx = Buffer.from(new Uint8Array([0]))
  const acct_len = Buffer.from(new Uint8Array(new BN(3).toArray('le', 1)))
  const recovery_threshold = Buffer.from(
    new Uint8Array(new BN(3).toArray('le', 1))
  )
  // const usdc_pk = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  const profile_pda = await PublicKey.findProgramAddress(
    [Buffer.from('profile', 'utf-8'), feePayer.publicKey.toBuffer()],
    programId
  )

  const guard1 = new Keypair()
  const guard2 = new Keypair()
  const guard3 = new Keypair()

  const initializeSocialWalletIx = new TransactionInstruction({
    keys: [
      {
        pubkey: profile_pda[0],
        isSigner: false,
        isWritable: true
      },
      {
        pubkey: feePayer.publicKey,
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

  // Instr 6 (3) recover wallet
  const idx5 = Buffer.from(new Uint8Array([5]))
  const new_acct_len = Buffer.from(new Uint8Array(new BN(3).toArray('le', 1)))
  const newFeePayer = new Keypair()

  console.log('Requesting Airdrop of 1 SOL to new fee payer...')
  await connection.requestAirdrop(newFeePayer.publicKey, 2e9)
  console.log('Airdrop received')

  const new_profile_pda = await PublicKey.findProgramAddress(
    [Buffer.from('profile', 'utf-8'), newFeePayer.publicKey.toBuffer()],
    programId
  )

  const recoverWalletIx = new TransactionInstruction({
    keys: [
      {
        pubkey: profile_pda[0],
        isSigner: false,
        isWritable: true
      },
      {
        pubkey: new_profile_pda[0],
        isSigner: false,
        isWritable: true
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: true
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false
      },
      {
        pubkey: newFeePayer.publicKey,
        isSigner: true,
        isWritable: true
      },
      {
        pubkey: guard1.publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: guard2.publicKey,
        isSigner: true,
        isWritable: false
      },
      {
        pubkey: guard3.publicKey,
        isSigner: true,
        isWritable: false
      }
    ],
    programId,
    data: Buffer.concat([idx5, new_acct_len])
  })

  const tx = new Transaction()
  tx.add(initializeSocialWalletIx).add(recoverWalletIx)

  const txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer, newFeePayer, guard1, guard2, guard3],
    {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      confirmation: 'confirmed'
    }
  )
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`)
}

main()
  .then(() => {
    console.log('Success')
  })
  .catch((e) => {
    console.error(e)
  })
