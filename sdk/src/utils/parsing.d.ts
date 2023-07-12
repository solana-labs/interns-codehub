/// <reference types="node" />
import { Account, Mint } from '@solana/spl-token'
import { AccountInfo, PublicKey } from '@solana/web3.js'
/**
 * Static abstract class definition to parse entities.
 * @category Parsables
 */
export interface ParsableEntity<T> {
  /**
   * Parse account data
   *
   * @param accountData Buffer data for the entity
   * @returns Parsed entity
   */
  parse: (
    address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ) => T | null
}
/**
 * @category Parsables
 */
export declare class ParsableTokenAccountInfo {
  private constructor()
  static parse(
    address: PublicKey,
    data: AccountInfo<Buffer> | undefined | null
  ): Account | null
}
/**
 * @category Parsables
 */
export declare class ParsableMintInfo {
  private constructor()
  static parse(
    address: PublicKey,
    data: AccountInfo<Buffer> | undefined | null
  ): Mint | null
}
/**
 * Class decorator to define an interface with static methods
 * Reference: https://github.com/Microsoft/TypeScript/issues/13462#issuecomment-295685298
 */
export declare function staticImplements<T>(): <U extends T>(
  constructor: U
) => void
