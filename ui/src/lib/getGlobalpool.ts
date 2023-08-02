import { Connection, PublicKey } from "@solana/web3.js"

import getAccountData from "@/lib/getAccountData"
import { ParsableGlobalpool } from "@/types/parsing"

export default async function getGlobalPool(globalpoolKey: PublicKey, connection: Connection) {
  return getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )
}