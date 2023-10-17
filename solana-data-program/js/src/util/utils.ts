import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";

export const loadKeypairFromFile = (filename: string): Keypair => {
  const secret = JSON.parse(readFileSync(filename).toString()) as number[];
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
};

export const loadJSONFromFile = (filename: string): string => {
  return readFileSync(filename).toString().trim();
};

export const loadPNGFromFile = (filename: string): Buffer => {
  return readFileSync(filename);
};

export const copyAccountData = async (
  connection: Connection,
  dataKey: PublicKey
) => {
  const data = (await connection.getAccountInfo(dataKey, "confirmed"))?.data;
  const proc = require("child_process").spawn("pbcopy");
  proc.stdin.write(data);
  proc.stdin.end();
};
