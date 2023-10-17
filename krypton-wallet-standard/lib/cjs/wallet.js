"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _KryptonWallet_instances, _KryptonWallet_listeners, _KryptonWallet_version, _KryptonWallet_name, _KryptonWallet_icon, _KryptonWallet_account, _KryptonWallet_krypton, _KryptonWallet_on, _KryptonWallet_emit, _KryptonWallet_off, _KryptonWallet_connected, _KryptonWallet_disconnected, _KryptonWallet_reconnected, _KryptonWallet_connect, _KryptonWallet_disconnect, _KryptonWallet_signAndSendTransaction, _KryptonWallet_signTransaction, _KryptonWallet_signMessage;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KryptonWallet = exports.KryptonNamespace = void 0;
const wallet_standard_features_1 = require("@solana/wallet-standard-features");
const web3_js_1 = require("@solana/web3.js");
const features_1 = require("@wallet-standard/features");
const bs58_1 = __importDefault(require("bs58"));
const account_js_1 = require("./account.js");
const icon_js_1 = require("./icon.js");
const solana_js_1 = require("./solana.js");
const util_js_1 = require("./util.js");
exports.KryptonNamespace = 'krypton:';
class KryptonWallet {
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
        return solana_js_1.SOLANA_CHAINS.slice();
    }
    get features() {
        return {
            [features_1.StandardConnect]: {
                version: '1.0.0',
                connect: __classPrivateFieldGet(this, _KryptonWallet_connect, "f"),
            },
            [features_1.StandardDisconnect]: {
                version: '1.0.0',
                disconnect: __classPrivateFieldGet(this, _KryptonWallet_disconnect, "f"),
            },
            [features_1.StandardEvents]: {
                version: '1.0.0',
                on: __classPrivateFieldGet(this, _KryptonWallet_on, "f"),
            },
            [wallet_standard_features_1.SolanaSignAndSendTransaction]: {
                version: '1.0.0',
                supportedTransactionVersions: ['legacy', 0],
                signAndSendTransaction: __classPrivateFieldGet(this, _KryptonWallet_signAndSendTransaction, "f"),
            },
            [wallet_standard_features_1.SolanaSignTransaction]: {
                version: '1.0.0',
                supportedTransactionVersions: ['legacy', 0],
                signTransaction: __classPrivateFieldGet(this, _KryptonWallet_signTransaction, "f"),
            },
            [wallet_standard_features_1.SolanaSignMessage]: {
                version: '1.0.0',
                signMessage: __classPrivateFieldGet(this, _KryptonWallet_signMessage, "f"),
            },
            [exports.KryptonNamespace]: {
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
        _KryptonWallet_icon.set(this, icon_js_1.icon);
        _KryptonWallet_account.set(this, null);
        _KryptonWallet_krypton.set(this, void 0);
        _KryptonWallet_on.set(this, (event, listener) => {
            var _a;
            ((_a = __classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event]) === null || _a === void 0 ? void 0 : _a.push(listener)) || (__classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event] = [listener]);
            return () => __classPrivateFieldGet(this, _KryptonWallet_instances, "m", _KryptonWallet_off).call(this, event, listener);
        });
        _KryptonWallet_connected.set(this, () => {
            var _a;
            const address = (_a = __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").publicKey) === null || _a === void 0 ? void 0 : _a.toBase58();
            if (address) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const publicKey = __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").publicKey.toBytes();
                const account = __classPrivateFieldGet(this, _KryptonWallet_account, "f");
                if (!account || account.address !== address || !(0, util_js_1.bytesEqual)(account.publicKey, publicKey)) {
                    __classPrivateFieldSet(this, _KryptonWallet_account, new account_js_1.KryptonWalletAccount({ address, publicKey }), "f");
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
        _KryptonWallet_connect.set(this, ({ silent } = {}) => __awaiter(this, void 0, void 0, function* () {
            if (!__classPrivateFieldGet(this, _KryptonWallet_account, "f")) {
                yield __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").connect(silent ? { onlyIfTrusted: true } : undefined);
            }
            __classPrivateFieldGet(this, _KryptonWallet_connected, "f").call(this);
            return { accounts: this.accounts };
        }));
        _KryptonWallet_disconnect.set(this, () => __awaiter(this, void 0, void 0, function* () {
            yield __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").disconnect();
        }));
        _KryptonWallet_signAndSendTransaction.set(this, (...inputs) => __awaiter(this, void 0, void 0, function* () {
            if (!__classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                throw new Error('not connected');
            const outputs = [];
            if (inputs.length === 1) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const { transaction, account, chain, options } = inputs[0];
                const { minContextSlot, preflightCommitment, skipPreflight, maxRetries } = options || {};
                if (account !== __classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                    throw new Error('invalid account');
                if (!(0, solana_js_1.isSolanaChain)(chain))
                    throw new Error('invalid chain');
                const { signature } = yield __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").signAndSendTransaction(web3_js_1.VersionedTransaction.deserialize(transaction), {
                    preflightCommitment,
                    minContextSlot,
                    maxRetries,
                    skipPreflight,
                });
                outputs.push({ signature: bs58_1.default.decode(signature) });
            }
            else if (inputs.length > 1) {
                for (const input of inputs) {
                    outputs.push(...(yield __classPrivateFieldGet(this, _KryptonWallet_signAndSendTransaction, "f").call(this, input)));
                }
            }
            return outputs;
        }));
        _KryptonWallet_signTransaction.set(this, (...inputs) => __awaiter(this, void 0, void 0, function* () {
            if (!__classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                throw new Error('not connected');
            const outputs = [];
            if (inputs.length === 1) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const { transaction, account, chain } = inputs[0];
                if (account !== __classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                    throw new Error('invalid account');
                if (chain && !(0, solana_js_1.isSolanaChain)(chain))
                    throw new Error('invalid chain');
                const signedTransaction = yield __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").signTransaction(web3_js_1.VersionedTransaction.deserialize(transaction));
                outputs.push({ signedTransaction: signedTransaction.serialize() });
            }
            else if (inputs.length > 1) {
                let chain = undefined;
                for (const input of inputs) {
                    if (input.account !== __classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                        throw new Error('invalid account');
                    if (input.chain) {
                        if (!(0, solana_js_1.isSolanaChain)(input.chain))
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
                const transactions = inputs.map(({ transaction }) => web3_js_1.Transaction.from(transaction));
                const signedTransactions = yield __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").signAllTransactions(transactions);
                outputs.push(...signedTransactions.map((signedTransaction) => ({ signedTransaction: signedTransaction.serialize() })));
            }
            return outputs;
        }));
        _KryptonWallet_signMessage.set(this, (...inputs) => __awaiter(this, void 0, void 0, function* () {
            if (!__classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                throw new Error('not connected');
            const outputs = [];
            if (inputs.length === 1) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const { message, account } = inputs[0];
                if (account !== __classPrivateFieldGet(this, _KryptonWallet_account, "f"))
                    throw new Error('invalid account');
                const { signature } = yield __classPrivateFieldGet(this, _KryptonWallet_krypton, "f").signMessage(message);
                outputs.push({ signedMessage: message, signature });
            }
            else if (inputs.length > 1) {
                for (const input of inputs) {
                    outputs.push(...(yield __classPrivateFieldGet(this, _KryptonWallet_signMessage, "f").call(this, input)));
                }
            }
            return outputs;
        }));
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
exports.KryptonWallet = KryptonWallet;
_KryptonWallet_listeners = new WeakMap(), _KryptonWallet_version = new WeakMap(), _KryptonWallet_name = new WeakMap(), _KryptonWallet_icon = new WeakMap(), _KryptonWallet_account = new WeakMap(), _KryptonWallet_krypton = new WeakMap(), _KryptonWallet_on = new WeakMap(), _KryptonWallet_connected = new WeakMap(), _KryptonWallet_disconnected = new WeakMap(), _KryptonWallet_reconnected = new WeakMap(), _KryptonWallet_connect = new WeakMap(), _KryptonWallet_disconnect = new WeakMap(), _KryptonWallet_signAndSendTransaction = new WeakMap(), _KryptonWallet_signTransaction = new WeakMap(), _KryptonWallet_signMessage = new WeakMap(), _KryptonWallet_instances = new WeakSet(), _KryptonWallet_emit = function _KryptonWallet_emit(event, ...args) {
    var _a;
    // eslint-disable-next-line prefer-spread
    (_a = __classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event]) === null || _a === void 0 ? void 0 : _a.forEach((listener) => listener.apply(null, args));
}, _KryptonWallet_off = function _KryptonWallet_off(event, listener) {
    var _a;
    __classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event] = (_a = __classPrivateFieldGet(this, _KryptonWallet_listeners, "f")[event]) === null || _a === void 0 ? void 0 : _a.filter((existingListener) => listener !== existingListener);
};
//# sourceMappingURL=wallet.js.map