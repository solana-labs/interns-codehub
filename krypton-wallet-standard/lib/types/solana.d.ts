import type { IdentifierString } from '@wallet-standard/base';
/** Solana Mainnet (beta) cluster, e.g. https://api.mainnet-beta.solana.com */
export declare const SOLANA_MAINNET_CHAIN = "solana:mainnet";
/** Solana Devnet cluster, e.g. https://api.devnet.solana.com */
export declare const SOLANA_DEVNET_CHAIN = "solana:devnet";
/** Solana Testnet cluster, e.g. https://api.testnet.solana.com */
export declare const SOLANA_TESTNET_CHAIN = "solana:testnet";
/** Solana Localnet cluster, e.g. http://localhost:8899 */
export declare const SOLANA_LOCALNET_CHAIN = "solana:localnet";
/** Array of all Solana clusters */
export declare const SOLANA_CHAINS: readonly ["solana:mainnet", "solana:devnet", "solana:testnet", "solana:localnet"];
/** Type of all Solana clusters */
export type SolanaChain = (typeof SOLANA_CHAINS)[number];
/**
 * Check if a chain corresponds with one of the Solana clusters.
 */
export declare function isSolanaChain(chain: IdentifierString): chain is SolanaChain;
//# sourceMappingURL=solana.d.ts.map