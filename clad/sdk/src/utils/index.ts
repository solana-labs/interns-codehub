import { AnchorProvider } from '@coral-xyz/anchor'
import { Instruction, TransactionBuilder } from '@orca-so/common-sdk'
import { PublicKey } from '@solana/web3.js'

import { CladContext } from '../impl/clad'
import { CladAccountFetcher } from './clad-fetcher'
import { GlobalpoolData, TokenAccountInfo, TokenInfo } from '@/types'

export class PDAUtil {}

export function toTx(ctx: CladContext, ix: Instruction): TransactionBuilder {
  return new TransactionBuilder(
    ctx.provider.connection,
    ctx.provider.wallet
  ).addInstruction(ix)
}

export async function getTokenBalance(
  provider: AnchorProvider,
  vault: PublicKey
) {
  return (await provider.connection.getTokenAccountBalance(vault, 'confirmed'))
    .value.amount
}

export async function getTokenMintInfos(
  fetcher: CladAccountFetcher,
  data: GlobalpoolData,
): Promise<TokenInfo[]> {
  const mintA = data.tokenMintA;
  const infoA = await fetcher.getMintInfo(mintA);
  if (!infoA) {
    throw new Error(`Unable to fetch MintInfo for mint - ${mintA}`);
  }
  const mintB = data.tokenMintB;
  const infoB = await fetcher.getMintInfo(mintB);
  if (!infoB) {
    throw new Error(`Unable to fetch MintInfo for mint - ${mintB}`);
  }
  return [
    { mint: mintA, ...infoA },
    { mint: mintB, ...infoB },
  ];
}

export async function getTokenVaultAccountInfos(
  fetcher: CladAccountFetcher,
  data: GlobalpoolData,
): Promise<TokenAccountInfo[]> {
  const vaultA = data.tokenVaultA;
  const vaultInfoA = await fetcher.getTokenInfo(vaultA);
  if (!vaultInfoA) {
    throw new Error(`Unable to fetch TokenAccountInfo for vault - ${vaultA}`);
  }
  const vaultB = data.tokenVaultB;
  const vaultInfoB = await fetcher.getTokenInfo(vaultB);
  if (!vaultInfoB) {
    throw new Error(`Unable to fetch TokenAccountInfo for vault - ${vaultB}`);
  }
  return [vaultInfoA, vaultInfoB];
}