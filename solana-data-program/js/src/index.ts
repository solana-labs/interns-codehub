import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as bs58 from "bs58";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { lookup } from "mime-types";
import { DataTypeOption } from "solana-data-program";
import uploadData from "./upload";
import viewData from "./view";

dotenv.config();

const getDataTypeFromMimeType = (mime: string | false) => {
  if (!mime) {
    return DataTypeOption.CUSTOM;
  }
  if (mime.indexOf("json") != -1) {
    return DataTypeOption.JSON;
  }
  if (mime.startsWith("image")) {
    return DataTypeOption.IMG;
  }
  if (mime.indexOf("html") != -1) {
    return DataTypeOption.HTML;
  }
  return DataTypeOption.CUSTOM;
};

const main = async () => {
  const connection = new Connection(process.env.CONNECTION_URL as string);

  // Command line argument checks
  const dynamic = process.argv.indexOf("--dynamic") > -1;
  const dataAccountIdx = process.argv.indexOf("--account");
  let dataPK: PublicKey | undefined;
  if (dataAccountIdx != -1) {
    if (process.argv.length < dataAccountIdx + 2) {
      console.error("No data account passed after --account flag");
      return;
    }
    dataPK = new PublicKey(process.argv[dataAccountIdx + 1]);
  }
  const uploadIdx = process.argv.indexOf("--upload");
  let filepath: string | undefined;
  if (uploadIdx != -1) {
    if (process.argv.length < uploadIdx + 2) {
      console.error("No filepath passed after --upload flag");
      return;
    }
    filepath = process.argv[uploadIdx + 1];
  }

  // View Data Account details
  if (process.argv.indexOf("--view") > -1) {
    if (!dataPK) {
      console.error("Missing data account");
      return;
    }
    await viewData(connection, dataPK);
    return;
  }

  const wallet = Keypair.fromSecretKey(
    bs58.decode(process.env.AUTHORITY_PRIVATE as string)
  );

  // Upload File
  if (uploadIdx > -1) {
    if (!filepath) {
      console.error("Missing file");
      return;
    }
    const dataType = getDataTypeFromMimeType(lookup(filepath));
    const data = readFileSync(filepath);
    await uploadData(connection, wallet, data, dataType, dynamic, dataPK);
    return;
  }
};

main()
  .then(() => console.log("success"))
  .catch((e) => console.error(e));
