import { Connection, PublicKey } from "@solana/web3.js"

import { getAccountData } from "@/lib"
import { ParsableGlobalpool } from "@/types/parsing"

export async function getGlobalpool(globalpoolKey: PublicKey, connection: Connection) {
  return getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )
}