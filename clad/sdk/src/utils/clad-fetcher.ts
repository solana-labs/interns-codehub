import {
  CladSupportedTypes,
  GlobalpoolData,
  LiquidityPositionData,
  TickArrayData,
} from '@/types'
import { Address } from '@coral-xyz/anchor'
import {
  AccountFetcher,
  AddressUtil,
  ParsableEntity,
  ParsableMintInfo,
  ParsableTokenAccountInfo,
  SimpleAccountFetcher,
} from '@orca-so/common-sdk'
import { AccountLayout, Mint, Account as TokenAccount } from '@solana/spl-token'
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import {
  ParsableGlobalpool,
  ParsableLiquidityPosition,
  ParsableTickArray,
} from './parsing'

export const DEFAULT_CLAD_RETENTION_POLICY: ReadonlyMap<
  ParsableEntity<CladSupportedTypes>,
  number
> = new Map<ParsableEntity<CladSupportedTypes>, number>([])

export const buildDefaultAccountFetcher = (connection: Connection) => {
  return new CladAccountFetcher(
    connection,
    new SimpleAccountFetcher(connection, DEFAULT_CLAD_RETENTION_POLICY)
  )
}

export class CladAccountFetcher {
  private _accountRentExempt: number | undefined

  constructor(
    readonly connection: Connection,
    readonly fetcher: AccountFetcher<CladSupportedTypes, { maxAge?: 3_600_000 }>
  ) {}

  async getAccountRentExempt(refresh: boolean = false): Promise<number> {
    // This value should be relatively static or at least not break according to spec
    // https://docs.solana.com/developing/programming-model/accounts#rent-exemption
    if (!this._accountRentExempt || refresh) {
      this._accountRentExempt =
        await this.connection.getMinimumBalanceForRentExemption(
          AccountLayout.span
        )
    }
    return this._accountRentExempt
  }

  getPool(address: Address): Promise<GlobalpoolData | null> {
    return this.fetcher.getAccount(address, ParsableGlobalpool)
  }

  getPools(
    addresses: Address[]
  ): Promise<ReadonlyMap<string, GlobalpoolData | null>> {
    return this.fetcher.getAccounts(addresses, ParsableGlobalpool)
  }

  getPosition(address: Address): Promise<LiquidityPositionData | null> {
    return this.fetcher.getAccount(address, ParsableLiquidityPosition)
  }

  getPositions(
    addresses: Address[]
  ): Promise<ReadonlyMap<string, LiquidityPositionData | null>> {
    return this.fetcher.getAccounts(addresses, ParsableLiquidityPosition)
  }

  getTickArray(address: Address): Promise<TickArrayData | null> {
    return this.fetcher.getAccount(address, ParsableTickArray)
  }

  getTickArrays(
    addresses: Address[]
  ): Promise<ReadonlyArray<TickArrayData | null>> {
    return this.fetcher.getAccountsAsArray(addresses, ParsableTickArray)
  }

  getTokenInfo(address: Address): Promise<TokenAccount | null> {
    return this.fetcher.getAccount(address, ParsableTokenAccountInfo)
  }

  getTokenInfos(
    addresses: Address[]
  ): Promise<ReadonlyMap<string, TokenAccount | null>> {
    return this.fetcher.getAccounts(addresses, ParsableTokenAccountInfo)
  }

  getMintInfo(address: Address): Promise<Mint | null> {
    return this.fetcher.getAccount(address, ParsableMintInfo)
  }

  getMintInfos(
    addresses: Address[]
  ): Promise<ReadonlyMap<string, Mint | null>> {
    return this.fetcher.getAccounts(addresses, ParsableMintInfo)
  }
}
