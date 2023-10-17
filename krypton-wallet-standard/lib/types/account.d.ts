import type { WalletAccount } from '@wallet-standard/base';
export declare class KryptonWalletAccount implements WalletAccount {
    #private;
    get address(): string;
    get publicKey(): Uint8Array;
    get chains(): `${string}:${string}`[];
    get features(): `${string}:${string}`[];
    get label(): string | undefined;
    get icon(): `data:image/svg+xml;base64,${string}` | `data:image/webp;base64,${string}` | `data:image/png;base64,${string}` | `data:image/gif;base64,${string}` | undefined;
    constructor({ address, publicKey, label, icon }: Omit<WalletAccount, 'chains' | 'features'>);
}
//# sourceMappingURL=account.d.ts.map