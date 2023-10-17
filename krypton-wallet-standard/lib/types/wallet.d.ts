import { type SolanaSignAndSendTransactionFeature, type SolanaSignMessageFeature, type SolanaSignTransactionFeature } from '@solana/wallet-standard-features';
import type { Wallet } from '@wallet-standard/base';
import { type StandardConnectFeature, type StandardDisconnectFeature, type StandardEventsFeature } from '@wallet-standard/features';
import { KryptonWalletAccount } from './account.js';
import type { Krypton } from './window.js';
export declare const KryptonNamespace = "krypton:";
export type KryptonFeature = {
    [KryptonNamespace]: {
        krypton: Krypton;
    };
};
export declare class KryptonWallet implements Wallet {
    #private;
    get version(): "1.0.0";
    get name(): "Krypton";
    get icon(): `data:image/svg+xml;base64,${string}` | `data:image/webp;base64,${string}` | `data:image/png;base64,${string}` | `data:image/gif;base64,${string}`;
    get chains(): ("solana:mainnet" | "solana:devnet" | "solana:testnet" | "solana:localnet")[];
    get features(): StandardConnectFeature & StandardDisconnectFeature & StandardEventsFeature & SolanaSignAndSendTransactionFeature & SolanaSignTransactionFeature & SolanaSignMessageFeature & KryptonFeature;
    get accounts(): KryptonWalletAccount[];
    constructor(krypton: Krypton);
}
//# sourceMappingURL=wallet.d.ts.map