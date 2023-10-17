import { Keypair, Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";

const {
  sendAndConfirmTransaction,

  Transaction,
  SystemProgram,
  
} = require("@solana/web3.js");
const base58 = require('bs58');

//const splToken = require("@solana/spl-token");


//import { createMint } from '@solana/spl-token';
const BN = require("bn.js");
//const { mintTo, TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, getAccount } = require("@solana/spl-token");

function genInitializeInputIx( authorized_buffer_key:PublicKey, feePayer : PublicKey, 
  programId: PublicKey,input_acc: String, input_val: Buffer,bufferSeed: Buffer) : TransactionInstruction{
  const idx7 = Buffer.from(new Uint8Array([7]));
  let initializeInputIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx7, base58.decode(input_acc), input_val, bufferSeed]),
  });
  return initializeInputIx;
}


function genInitializeOutputIx( authorized_buffer_key:PublicKey, feePayer : PublicKey, 
  programId: PublicKey,output_acc: String, output_val: Buffer,bufferSeed: Buffer) : TransactionInstruction{
  const idx8 = Buffer.from(new Uint8Array([8]));
  let initializeOutputIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx8, base58.decode(output_acc), output_val, bufferSeed]),
  });
  return initializeOutputIx;
}

function genWithdraw1Ix(authorized_buffer_key:PublicKey, senderPk : PublicKey, 
  programId: PublicKey,output_acc: PublicKey, output_val: Buffer,bufferSeed: Buffer) : TransactionInstruction{
    const idx10 = Buffer.from(new Uint8Array([10]));
    let idx = Buffer.from(new Uint8Array([0]));
    if (output_acc == senderPk) {
      let idx = Buffer.from(new Uint8Array([1]));
    }
  let refund1Ix = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: senderPk,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: output_acc,
        isSigner: false,
        isWritable: true,
      },
     
    ],
    programId: programId,
    data: Buffer.concat([idx10,  bufferSeed,idx]),
  });
  return refund1Ix;
}

const main = async () => {
  var args = process.argv.slice(2);
  //console.log(args)
  const programId = new PublicKey(args[0]);
  const myseed = parseInt(args[1]);

  const connection = new Connection("https://api.devnet.solana.com/");



  const privKey = new Uint8Array([
    54, 160, 60, 31, 94, 93, 163, 118, 126, 47, 127,
    223, 96, 134, 231, 31, 171, 171, 98, 63, 245, 109,
    164, 241, 196, 240, 233, 165, 195, 166, 66, 1, 241,
    51, 62, 197, 32, 71, 245, 174, 48, 162, 115, 166,
    117, 169, 34, 2, 181, 90, 70, 72, 149, 88, 101,
    171, 51, 40, 173, 124, 172, 117, 242, 121
  ])
  const feePayer: Keypair = Keypair.fromSecretKey(privKey);

  //console.log(feePayer.publicKey.toBase58());
  const echoBuffer = new Keypair();

  //console.log(echoBuffer.secretKey);

  const vending_machine_buffer = new Keypair();
  //const payer = new Keypair();
  const mintAuthority = new Keypair();
  const freezeAuthority = new Keypair();

  console.log("Requesting 1 Airdrop of 1 SOL...");
  //await connection.requestAirdrop(feePayer.publicKey, 2e9);
  console.log("Airdrop received");



  let in_accs2 = ["Hivws9FpYpuRqJUF7fBJ8m6SQu5r7TbQNNxx5ZHZYpMa", "FVMCqfvGP8iZX45pjFW1ZCUaNKSLCGV6at3w1z7ohw8j",
  "HavPpn11v6mroEjToxLMcChjCmo4Z66gUU4BGdDvNMic",
"4U3CTkUt6d1eJCceMX3L6GqUEu1ZFV9p9Png4SnuTEai",
"CbLrTqziuEhMeM5PS32HxMFZYjrZm8tUZZabV13fYkAv",
"6LUF486oFBHmgSh5urKgWRgh8StAJpyrGit9JywLLsjo",
"4BRU61Wp3HvpCuCAF1nZ1fitNfuhVjTUYbpRysUswnon",
"HTS38rZsSSoGmkHHDWnZZfAtFsbhu2pczwGDstWWQcZj",
"42PD6dFMDD4Jw1K6FEY4FS7MfcyvLqBupGoV9MLqabKW",
"4ntnWxeJC6tP4k9YBbVLNuxtDN1MbEwe4MHTpe6pkUJZ",
"BAuLRd7QS19B9KdyyXkV69ktxMectxo2z4x5qpCqf9nV",
"9PNZ5PqbngNZzT32SmgfiXihsKfeEFo8VNWSqrfbBSKZ",
"BRA8Qq8ZeoR5XvirLGPJbCK4SrqHnqbHoTfADi6mf2B1",
"J2AQmCkv6eEY8GKjdA6jhr5qZnVcmFPdc2QdYHQqaWZd",
"ErVyfiXt3k6hBdsGo398nb8UrRdjbUBWBzcpxgYyC6ZU",
"4ofrdKB7bAJkDY6KJsBZLqYxhzG4iJggyVQm9HDo9mWZ",
"7jDtGKCrAdZn5cZhPgQKSWK2HgL6KXNfw5Xwx547vATk",
"6nXTWfJa71QKZJ8XLRaQ3Qdzq3QhajRY4hBgzQWYP99d",
"7g5N5ztRGJUhNeD4HuX7S5tNbJJjbjKzt1YZJ5WUz59v",
"9rA7vrAQWFCYqP8bREqFiAiMMXo4vrnMXvNB9z1cxPXq",
"D5HPp48zttxhYTURP1pE8hqFZMQFxREB3yivDsnhmAb2",
"9WxzwArmCyrYSVzVe6CcXPq5jBGs8aoLRJmjoc5PwyPk"

];

let in_accs = ["Hivws9FpYpuRqJUF7fBJ8m6SQu5r7TbQNNxx5ZHZYpMa", "FVMCqfvGP8iZX45pjFW1ZCUaNKSLCGV6at3w1z7ohw8j",
"5u1f8nzajRPpw3vvB1TgybHNmoEK3czyRcx5MQy5iDat"];
  let in_amounts2 = new BigUint64Array([200000n, 200000n,200000n, 100000n,100000n,100000n,100000n,100000n,100000n,100000n,
    100000n,100000n,100000n,100000n,100000n,100000n,100000n,100000n,100000n,100000n,100000n,100000n]);
  let in_amounts = new BigUint64Array([100000n, 100000n, 100000n]);
  let out_accs2 = ["8FRE4XE8KVoMMpjavFSbxh8y1wbNkCMpS7RhVxDjY3Ei", "FZi1KVJ1zHocTqeiW46jBJ6LEt7LtdK9PdTMJc5NwzYR",
    "75ahZrrwCNjmcg4M62k8ghhru87qi8V8RKnqgB4FF6a6", "9sKcTgpuWFssSNkEEMaDgdiFCiZXjk26Bt14iUF4ddu7", "A1k1uedaWeqXLHLv1PdAUFPW5sggU5mBk3ABNjVLWU8g",
    "FEQtE24BAGfALdXZ1utCMFjmFLgPTk8J2Vm3fbTT8N3H", "C5eZtwMCbj2QqwH4VAHcEBoG98WLiRd8mgPxpTi9graU", "3tAFiXffvyak1Zx1A43YBBzrNGzhmVqWMwaJkCj9rkaM",
    "E4MxgDoxfYnUB36ZoKxwwVaCFj4rfvihgdXgtaQbSXz8", "9mMtr7Rx8ajjpRbHmUzb5gjgBLqNtPABdkNiUBAkTrmR", "C1SrSkrvXNe8zQW7vkQTTY7d8ubmTgRwY7bnFeTZPuGp",
    "E3tmHCiDaj4PD55ULrPzsDEcirhwYwios8RXLREGzZS6", "Fdud1JSzUBBxH9LcsqoKVbtSTjQcpAvU5gB9b8rojkZz", "EbFX9Q2Z6BFaRekB2S9RJpQH9AEyXrj6Cb8uovEpzoW6",
    "ChTh69VWmMKsMT8pfb1e9tB7LzjHfjVARq5GQFRESvQt", "EqrEtjNoENJ2vErFCfRpXYZBDdzrSLyQhTRqTLSWxZq5", "9pHa4sya4HvmeuPt4JzGARusPHFMsmsGqJRan7GTwZ1T",
    "BwRDSx6VRwmw1jWVCwmqvsb2WagqCptzf7UKRrWP7dYU", "145LWiDkp2PL8QHuKLSGXUvLYjAN8DZDpornN7n4pEqs", "bA8zWXkH9bZiqRKbG6Scm1DFegeSGXUE96nCTz7rFgu",
    "Hivws9FpYpuRqJUF7fBJ8m6SQu5r7TbQNNxx5ZHZYpMa", "FVMCqfvGP8iZX45pjFW1ZCUaNKSLCGV6at3w1z7ohw8j", "5u1f8nzajRPpw3vvB1TgybHNmoEK3czyRcx5MQy5iDat",
    "85yuJubaW934GZza9LEC1aVbfkyS7rasmnYTV3aeX85m", "HdYi3gCX5BQ3btGbPLoGAZi3CtfQmJZcFMQ6wk5qo6F5"];
    let out_accs = ["8FRE4XE8KVoMMpjavFSbxh8y1wbNkCMpS7RhVxDjY3Ei", "FZi1KVJ1zHocTqeiW46jBJ6LEt7LtdK9PdTMJc5NwzYR"];
  let out_amounts = new BigUint64Array([100000n, 100000n]);
    let out_amounts2 = new BigUint64Array([100000n, 100000n, 100000n, 100000n, 100000n, 100000n,
      100000n, 100000n, 100000n, 100000n, 100000n, 100000n, 100000n, 100000n, 100000n, 100000n, 100000n, 100000n, 100000n, 100000n,
      100000n, 100000n,100000n,100000n,100000n]);
  console.log(out_amounts.length);
  let in_acc_buff = base58.decode(in_accs[0]);
  for (let i = 1; i < in_accs.length; i++) {
    in_acc_buff = Buffer.concat([in_acc_buff, base58.decode(in_accs[i])]);
  }
  let out_acc_buff = base58.decode(out_accs[0]);
  for (let i = 1; i < out_accs.length; i++) {
    out_acc_buff = Buffer.concat([out_acc_buff, base58.decode(out_accs[i])]);
  }



  const in_accs_len = Buffer.from(new Uint8Array((new BN(in_accs.length)).toArray("le", 4)));
  const in_accs_len8 = Buffer.from(new Uint8Array((new BN(in_accs.length)).toArray("le", 8)));
  const in_amounts_len = Buffer.from(new Uint8Array((new BN(in_amounts.length)).toArray("le", 4)));
  const out_accs_len = Buffer.from(new Uint8Array((new BN(out_accs.length)).toArray("le", 4)));
  const out_accs_len8 = Buffer.from(new Uint8Array((new BN(out_accs.length)).toArray("le",8)));
  const out_amounts_len = Buffer.from(new Uint8Array((new BN(out_amounts.length)).toArray("le", 4)));

  const idx = Buffer.from(new Uint8Array([0]));
  const idx1 = Buffer.from(new Uint8Array([1]));
  const idx2 = Buffer.from(new Uint8Array([2]));
  const idx3 = Buffer.from(new Uint8Array([3]));
  const idx4 = Buffer.from(new Uint8Array([4]));
  const idx5 = Buffer.from(new Uint8Array([5]));
  const idx6 = Buffer.from(new Uint8Array([6]));
  const idx7 = Buffer.from(new Uint8Array([7]));
  const idx8 = Buffer.from(new Uint8Array([8]));
  const idx9 = Buffer.from(new Uint8Array([9]));
  const idx11 = Buffer.from(new Uint8Array([11]));


  const bufferSeed = Buffer.from(new Uint8Array((new BN(myseed)).toArray("le", 8)));
  const price = Buffer.from(new Uint8Array((new BN(10000000)).toArray("le", 8)));



  let authorized_buffer_key = PublicKey.findProgramAddressSync(
    [
      Buffer.from("authority", "utf-8"),
      programId.toBuffer(),
      bufferSeed],
    programId)[0];



  let closeIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx1,bufferSeed]),
  });

  let initializeSmartSendIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx4, in_accs_len8, out_accs_len8, bufferSeed]),
  });
  console.log(in_accs_len8);
  console.log(out_accs_len8);

  

  let initializeInputIx = genInitializeInputIx(authorized_buffer_key,feePayer.publicKey,programId, 
    in_accs[0],Buffer.from(in_amounts[0].toString()),bufferSeed);

  let initializeOutputsIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx6, out_accs_len, out_acc_buff, out_amounts_len, Buffer.from(out_amounts.buffer), bufferSeed]),
  });


  let initializeInputsIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx5, in_accs_len, in_acc_buff, in_amounts_len, Buffer.from(in_amounts.buffer), bufferSeed]),
  });

  let smartDepositIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx2, price, bufferSeed]),
  });

  //console.log(feePayer.publicKey);
  let smartSendIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx3, bufferSeed]),
  });
  let refundIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
     
    ],
    programId: programId,
    data: Buffer.concat([idx, bufferSeed]),
  });

 
  out_accs.forEach(acc => smartSendIx.keys.push(
    {
      pubkey: new PublicKey(acc),
      isSigner: false,
      isWritable: true,
    }
  ));
  in_accs.forEach(acc => refundIx.keys.push(
    {
      pubkey: new PublicKey(acc),
      isSigner: false,
      isWritable: true,
    }
  ));


  let debugIx = new TransactionInstruction({
    keys: [
      {
        pubkey: authorized_buffer_key,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx11, bufferSeed]),
  });

  let tx = new Transaction();
  //tx.add(closeIx);
  tx.add(initializeSmartSendIx);
  tx.add(initializeInputsIx);
  tx.add(initializeOutputsIx);
  //tx.add(smartDepositIx);
  //tx.add(refundIx);
  //tx.add(smartSendIx);
  //tx.add(debugIx);
  // tx.add(
  //   genInitializeInputIx(authorized_buffer_key,feePayer.publicKey,programId, 
  //     in_accs[0],Buffer.from(new Uint8Array((new BN(in_amounts[0])).toArray("le", 8))),bufferSeed)
  // );
  // for (let i =0; i < in_accs.length; i++ ){
  //     if (i == 0) continue; 
  //     tx.add(
  //       genInitializeInputIx(authorized_buffer_key,feePayer.publicKey,programId, 
  //         in_accs[i],Buffer.from(new Uint8Array((new BN(in_amounts[i])).toArray("le", 8))),bufferSeed)
  //     );
  //   }
  // for (let i in out_accs ){
  //   tx.add(
  //     genInitializeOutputIx(authorized_buffer_key,feePayer.publicKey,programId, 
  //       out_accs[i],Buffer.from(new Uint8Array((new BN(out_amounts[i])).toArray("le", 8))),bufferSeed)
  //   );
  // }

  // for (let i in out_accs ){
  //   tx.add(
  //     genWithdraw1Ix(authorized_buffer_key,feePayer.publicKey,programId, 
  //       new PublicKey(out_accs[i]),Buffer.from(new Uint8Array((new BN(out_amounts[i])).toArray("le", 8))),bufferSeed)
  //   );
  // }

  console.log("Starting transaction");

  connection
  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    }
  );
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

  //data = (await connection.getAccountInfo(echoBuffer.publicKey)).data;
  //console.log("Echo Buffer Text:", data.toString());



};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
