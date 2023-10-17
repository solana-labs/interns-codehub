var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _KryptonWallet_instances, _KryptonWallet_listeners, _KryptonWallet_version, _KryptonWallet_name, _KryptonWallet_icon, _KryptonWallet_account, _KryptonWallet_krypton, _KryptonWallet_on, _KryptonWallet_emit, _KryptonWallet_off, _KryptonWallet_connected, _KryptonWallet_disconnected, _KryptonWallet_reconnected, _KryptonWallet_connect, _KryptonWallet_disconnect, _KryptonWallet_signAndSendTransaction, _KryptonWallet_signTransaction, _KryptonWallet_signMessage;
import { SolanaSignAndSendTransaction, SolanaSignMessage, SolanaSignTransaction, } from '@solana/wallet-standard-features';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { StandardConnect, StandardDisconnect, StandardEvents, } from '@wallet-standard/features';
import bs58 from 'bs58';
import { KryptonWalletAccount } from './account.js';
import { icon } from './icon.js';
import { isSolanaChain, SOLANA_CHAINS } from './solana.js';
import { bytesEqual } from './util.js';
export const KryptonNamespace = 'krypton:';
export class KryptonWallet {
    get version() {
        return __classPrivateFieldGet(this, _KryptonWallet_version, "f");
    }
    get name() {
        return __classPrivateFieldGet(this, _KryptonWallet_name, "f");
    }
    get icon() {
        return __classPrivateFieldGet(this, _KryptonWallet_icon, "f");
    }
    get chains() {
        return SOLANA_CHAINS.slice();
    }
    get features() {
        return {
            [StandardConnect]: {
                version: '1.0.0',
                connect: __classPrivateFieldGet(this, _KryptonWallet_connect, "f"),
            },
            [StandardDisconnect]: {
                version: '1.0.0',
                disconnect: __classPrivateFieldGet(this, _KryptonWallet_disconnect, "f"),
            },
            [StandardEvents]: {
                version: '1.0.0',
                on: __classPrivateFieldGet(this, _KryptonWallet_on, "f"),
            },
            [SolanaSignAndSendTransaction]: {
                version: '1.0.0',
                supportedTransactionVersions: ['legacy', 0],
                signAndSendTransaction: __classPrivateFieldGet(this, _KryptonWallet_signAndSendTransaction, "f"),
            },
            [SolanaSignTransaction]: {
                version: '1.0.0',
                supportedTransactionVersions: ['legacy', 0],
                signTransaction: __classPrivateFieldGet(this, _KryptonWallet_signTransaction, "f"),
            },
            [SolanaSignMessage]: {
                version: '1.0.0',
                signMessage: __classPrivateFieldGet(this, _KryptonWallet_signMessage, "f"),
            },
            [KryptonNamespace]: {
                krypton: __classPrivateFieldGet(this, _KryptonWallet_krypton, "f"),
            },
        };
    }
    get accounts() {
        return __classPrivateFieldGet(this, _KryptonWallet_account, "f") ? [__classPrivateFieldGet(this, _KryptonWallet_account, "f")] : [];
    }
    constructor(krypton) {
        _KryptonWallet_instances.add(this);
        _KryptonWallet_listeners.set(this, {});
        _KryptonWallet_version.set(this, '1.0.0');
        _KryptonWallet_name.set(this, 'Krypton');
        _KryptonWallet_icon.set(this, icon);
        _KryptonWallet_account.set(this, null);
        _KryptonWallet_krypton.set(this, void 0);
        _KryptonWallet_on.set(this, (event, listener) => {
            __classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event]?.push(listener) || (__classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event] = [listener]);
            return () => __classPrivateFieldGet(this, _KryptonWallet_instances, "m", _KryptonWallet_off).call(this, event, listener);
        });
        _KryptonWallet_connected.set(this, () => {
            const address = __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").publicKey?.toBase58();
            if (address) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const publicKey = __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").publicKey.toBytes();
                const account = __classPrivateFieldGet(this, _KryptonWallet_account, "f");
                if (!account || account.address !== address || !bytesEqual(account.publicKey, publicKey)) {
                    __classPrivateFieldSet(this, _KryptonWallet_account, new KryptonWalletAccount({ address, publicKey }), "f");
                    __classPrivateFieldGet(this, _KryptonWallet_instances, "m", _KryptonWallet_emit).call(this, 'change', { accounts: this.accounts });
                }
            }
        });
        _KryptonWallet_disconnected.set(this, () => {
            if (__classPrivateFieldGet(this, _KryptonWallet_account, "f")) {
                __classPrivateFieldSet(this, _KryptonWallet_account, null, "f");
                __classPrivateFieldGet(this, _KryptonWallet_instances, "m", _KryptonWallet_emit).call(this, 'change', { accounts: this.accounts });
            }
        });
        _KryptonWallet_reconnected.set(this, () => {
            if (__classPrivateFieldGet(this, _KryptonWallet_krypton, "f").publicKey) {
                __classPrivateFieldGet(this, _KryptonWallet_connected, "f").call(this);
            }
            else {
                __classPrivateFieldGet(this, _KryptonWallet_disconnected, "f").call(this);
            }
        });
        _KryptonWallet_connect.set(this, async ({ silent } = {}) => {
            if (!__classPrivateFieldGet(this, _KryptonWallet_account, "f")) {
                await __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").connect(silent ? { onlyIfTrusted: true } : undefined);
            }
            __classPrivateFieldGet(this, _KryptonWallet_connected, "f").call(this);
            return { accounts: this.accounts };
        });
        _KryptonWallet_disconnect.set(this, async () => {
            await __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").disconnect();
        });
        _KryptonWallet_signAndSendTransaction.set(this, async (...inputs) => {
            if (!__classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                throw new Error('not connected');
            const outputs = [];
            if (inputs.length === 1) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const { transaction, account, chain, options } = inputs[0];
                const { minContextSlot, preflightCommitment, skipPreflight, maxRetries } = options || {};
                if (account !== __classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                    throw new Error('invalid account');
                if (!isSolanaChain(chain))
                    throw new Error('invalid chain');
                const { signature } = await __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").signAndSendTransaction(VersionedTransaction.deserialize(transaction), {
                    preflightCommitment,
                    minContextSlot,
                    maxRetries,
                    skipPreflight,
                });
                outputs.push({ signature: bs58.decode(signature) });
            }
            else if (inputs.length > 1) {
                for (const input of inputs) {
                    outputs.push(...(await __classPrivateFieldGet(this, _KryptonWallet_signAndSendTransaction, "f").call(this, input)));
                }
            }
            return outputs;
        });
        _KryptonWallet_signTransaction.set(this, async (...inputs) => {
            if (!__classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                throw new Error('not connected');
            const outputs = [];
            if (inputs.length === 1) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const { transaction, account, chain } = inputs[0];
                if (account !== __classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                    throw new Error('invalid account');
                if (chain && !isSolanaChain(chain))
                    throw new Error('invalid chain');
                const signedTransaction = await __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").signTransaction(VersionedTransaction.deserialize(transaction));
                outputs.push({ signedTransaction: signedTransaction.serialize() });
            }
            else if (inputs.length > 1) {
                let chain = undefined;
                for (const input of inputs) {
                    if (input.account !== __classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                        throw new Error('invalid account');
                    if (input.chain) {
                        if (!isSolanaChain(input.chain))
                            throw new Error('invalid chain');
                        if (chain) {
                            if (input.chain !== chain)
                                throw new Error('conflicting chain');
                        }
                        else {
                            chain = input.chain;
                        }
                    }
                }
                const transactions = inputs.map(({ transaction }) => Transaction.from(transaction));
                const signedTransactions = await __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").signAllTransactions(transactions);
                outputs.push(...signedTransactions.map((signedTransaction) => ({ signedTransaction: signedTransaction.serialize() })));
            }
            return outputs;
        });
        _KryptonWallet_signMessage.set(this, async (...inputs) => {
            if (!__classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                throw new Error('not connected');
            const outputs = [];
            if (inputs.length === 1) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const { message, account } = inputs[0];
                if (account !== __classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                    throw new Error('invalid account');
                const { signature } = await __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").signMessage(message);
                outputs.push({ signedMessage: message, signature });
            }
            else if (inputs.length > 1) {
                for (const input of inputs) {
                    outputs.push(...(await __classPrivateFieldGet(this, _KryptonWallet_signMessage, "f").call(this, input)));
                }
            }
            return outputs;
        });
        if (new.target === KryptonWallet) {
            Object.freeze(this);
        }
        __classPrivateFieldSet(this, _KryptonWallet_krypton, krypton, "f");
        krypton.on('connect', __classPrivateFieldGet(this, _KryptonWallet_connected, "f"), this);
        krypton.on('disconnect', __classPrivateFieldGet(this, _KryptonWallet_disconnected, "f"), this);
        krypton.on('accountChanged', __classPrivateFieldGet(this, _KryptonWallet_reconnected, "f"), this);
        __classPrivateFieldGet(this, _KryptonWallet_connected, "f").call(this);
    }
}
_KryptonWallet_listeners = new WeakMap(), _KryptonWallet_version = new WeakMap(), _KryptonWallet_name = new WeakMap(), _KryptonWallet_icon = new WeakMap(), _KryptonWallet_account = new WeakMap(), _KryptonWallet_krypton = new WeakMap(), _KryptonWallet_on = new WeakMap(), _KryptonWallet_connected = new WeakMap(), _KryptonWallet_disconnected = new WeakMap(), _KryptonWallet_reconnected = new WeakMap(), _KryptonWallet_connect = new WeakMap(), _KryptonWallet_disconnect = new WeakMap(), _KryptonWallet_signAndSendTransaction = new WeakMap(), _KryptonWallet_signTransaction = new WeakMap(), _KryptonWallet_signMessage = new WeakMap(), _KryptonWallet_instances = new WeakSet(), _KryptonWallet_emit = function _KryptonWallet_emit(event, ...args) {
    // eslint-disable-next-line prefer-spread
    __classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event]?.forEach((listener) => listener.apply(null, args));
}, _KryptonWallet_off = function _KryptonWallet_off(event, listener) {
    __classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event] = __classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event]?.filter((existingListener) => listener !== existingListener);
};
//# sourceMappingURL=wallet.js.map