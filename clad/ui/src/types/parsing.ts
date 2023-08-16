import { BorshAccountsCoder, Idl } from '@coral-xyz/anchor'
import { ParsableEntity, staticImplements } from '@orca-so/common-sdk'
import { AccountInfo, PublicKey } from '@solana/web3.js'

import * as CladIDL from '@/target/idl/clad.json'
import {
  AccountName,
  GlobalpoolData,
  LiquidityPositionData,
  TickArrayData,
  TradePositionData,
} from '@/types/accounts'

@staticImplements<ParsableEntity<GlobalpoolData>>()
export class ParsableGlobalpool {
  private constructor() {}

  public static parse(
    address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): GlobalpoolData | null {
    if (!accountData?.data) {
      return null
    }

    try {
      return parseAnchorAccount(AccountName.Globalpool, accountData)
    } catch (e) {
      console.error(`error while parsing Globalpool: ${e}`)
      return null
    }
  }
}

@staticImplements<ParsableEntity<LiquidityPositionData>>()
export class ParsableLiquidityPosition {
  private constructor() {}

  public static parse(
    address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): LiquidityPositionData | null {
    if (!accountData?.data) {
      return null
    }

    try {
      return parseAnchorAccount(AccountName.LiquidityPosition, accountData)
    } catch (e) {
      console.error(`error while parsing LiquidityPosition: ${e}`)
      return null
    }
  }
}

@staticImplements<ParsableEntity<TradePositionData>>()
export class ParsableTradePosition {
  private constructor() {}

  public static parse(
    address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): TradePositionData | null {
    if (!accountData?.data) {
      return null
    }

    try {
      return parseAnchorAccount(AccountName.TradePosition, accountData)
    } catch (e) {
      console.error(`error while parsing LiquidityPosition: ${e}`)
      return null
    }
  }
}

@staticImplements<ParsableEntity<TickArrayData>>()
export class ParsableTickArray {
  private constructor() {}

  public static parse(
    address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): TickArrayData | null {
    if (!accountData?.data) {
      return null
    }

    try {
      return parseAnchorAccount(AccountName.TickArray, accountData)
    } catch (e) {
      console.error(`error while parsing TickArray: ${e}`)
      return null
    }
  }
}

const CladCoder = new BorshAccountsCoder(CladIDL as Idl)

function parseAnchorAccount(
  accountName: AccountName,
  accountData: AccountInfo<Buffer>
) {
  const data = accountData.data
  const discriminator = BorshAccountsCoder.accountDiscriminator(accountName)
  if (discriminator.compare(data.subarray(0, 8))) {
    console.error('incorrect account name during parsing')
    return null
  }

  try {
    return CladCoder.decode(accountName, data)
  } catch (_e) {
    console.error('unknown account name during parsing')
    return null
  }
}
