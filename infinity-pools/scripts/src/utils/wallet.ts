import { Wallet } from '@coral-xyz/anchor'
import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'
import { Buffer } from 'buffer'

/**
 * Check if a transaction object is a VersionedTransaction or not
 *
 * @param tx
 * @returns bool
 */
export const isVersionedTransaction = (
  tx: Transaction | VersionedTransaction
): tx is VersionedTransaction => {
  return 'version' in tx
}

/**
 * Node only wallet.
 */
export default class DummyWallet implements Wallet {
  readonly payer: Keypair

  constructor() {
    this.payer = Keypair.generate()
    // Keypair.fromSecretKey(
    //   Buffer.from(
    //     JSON.parse(
    //       require("fs").readFileSync(process.env.ANCHOR_WALLET, {
    //         encoding: "utf-8",
    //       })
    //     )
    //   )
    // )
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    if (isVersionedTransaction(tx)) {
      tx.sign([this.payer])
    } else {
      tx.partialSign(this.payer)
    }

    return tx
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return txs.map((t) => {
      if (isVersionedTransaction(t)) {
        t.sign([this.payer])
      } else {
        t.partialSign(this.payer)
      }
      return t
    })
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey
  }
}
