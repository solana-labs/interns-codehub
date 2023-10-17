import { TokenInfo, TokenListProvider } from '@solana/spl-token-registry';
import { Cluster } from '@solana/web3.js';

export const network2chainId = (network: Cluster) => {
  if(network == "mainnet-beta") {
      return 101;
  } else if (network == "devnet") {
      return 103;
  } else {
      return 102;
  }
}

export const getTokenMap = async (network: Cluster | undefined) => {
  let tokenMap = new Map<string, TokenInfo>();
  await new TokenListProvider().resolve().then((tokens) => {
    const tokenList = tokens
      .filterByChainId(network2chainId(network!))
      .getList();
    tokenMap = tokenList.reduce((map, item) => {
      map.set(item.address, item);
      return map;
    }, new Map());
  });
  return tokenMap;
}

export const getTokenIconString = async (mint: string, tokenMap: Map<string, TokenInfo>) => {
  const token = tokenMap.get(mint);
  if (!token || !token.logoURI) return null;
  return token.logoURI;
}

export const getTokenName = async (mint: string, tokenMap: Map<string, TokenInfo>) => {
  const token = tokenMap.get(mint);
  if (!token || !token.name) return null;
  return token.name;
}