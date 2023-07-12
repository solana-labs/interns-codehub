import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";

(async () => {
  const keypair = Keypair.generate();
    console.log("keypair", keypair);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const wallet = JSON.parse(fs.readFileSync("../keys/wallet.json", "utf-8"))
  const signature = await connection.requestAirdrop(
    wallet.publicKey,
    LAMPORTS_PER_SOL
  );
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    });
})();