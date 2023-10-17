import { Connection, PublicKey } from "@solana/web3.js";
import { DataProgram, DataTypeOption } from "solana-data-program";

const main = async (connection: Connection, dataPK: PublicKey) => {
  console.log("Data Account:", dataPK.toBase58());
  const [meta, data] = await Promise.all([
    DataProgram.parseMetadata(connection, dataPK, "confirmed"),
    DataProgram.parseData(connection, dataPK, "confirmed"),
  ]);
  console.log(JSON.stringify(meta, null, 2));
  if (meta.dataType === DataTypeOption.JSON) {
    if (data) {
      console.log(JSON.stringify(JSON.parse(data.toString()), null, 2));
    }
  }
};

export default main;
