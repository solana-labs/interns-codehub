"use strict";
// This is copied with modification from @wallet-standard/wallet
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
var _KryptonWalletAccount_address, _KryptonWalletAccount_publicKey, _KryptonWalletAccount_chains, _KryptonWalletAccount_features, _KryptonWalletAccount_label, _KryptonWalletAccount_icon;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KryptonWalletAccount = void 0;
const wallet_standard_features_1 = require("@solana/wallet-standard-features");
const solana_js_1 = require("./solana.js");
const chains = solana_js_1.SOLANA_CHAINS;
const features = [wallet_standard_features_1.SolanaSignAndSendTransaction, wallet_standard_features_1.SolanaSignTransaction, wallet_standard_features_1.SolanaSignMessage];
class KryptonWalletAccount {
    get address() {
        return __classPrivateFieldGet(this, _KryptonWalletAccount_address, "f");
    }
    get publicKey() {
        return __classPrivateFieldGet(this, _KryptonWalletAccount_publicKey, "f").slice();
    }
    get chains() {
        return __classPrivateFieldGet(this, _KryptonWalletAccount_chains, "f").slice();
    }
    get features() {
        return __classPrivateFieldGet(this, _KryptonWalletAccount_features, "f").slice();
    }
    get label() {
        return __classPrivateFieldGet(this, _KryptonWalletAccount_label, "f");
    }
    get icon() {
        return __classPrivateFieldGet(this, _KryptonWalletAccount_icon, "f");
    }
    constructor({ address, publicKey, label, icon }) {
        _KryptonWalletAccount_address.set(this, void 0);
        _KryptonWalletAccount_publicKey.set(this, void 0);
        _KryptonWalletAccount_chains.set(this, void 0);
        _KryptonWalletAccount_features.set(this, void 0);
        _KryptonWalletAccount_label.set(this, void 0);
        _KryptonWalletAccount_icon.set(this, void 0);
        if (new.target === KryptonWalletAccount) {
            Object.freeze(this);
        }
        __classPrivateFieldSet(this, _KryptonWalletAccount_address, address, "f");
        __classPrivateFieldSet(this, _KryptonWalletAccount_publicKey, publicKey, "f");
        __classPrivateFieldSet(this, _KryptonWalletAccount_chains, chains, "f");
        __classPrivateFieldSet(this, _KryptonWalletAccount_features, features, "f");
        __classPrivateFieldSet(this, _KryptonWalletAccount_label, label, "f");
        __classPrivateFieldSet(this, _KryptonWalletAccount_icon, icon, "f");
    }
}
exports.KryptonWalletAccount = KryptonWalletAccount;
_KryptonWalletAccount_address = new WeakMap(), _KryptonWalletAccount_publicKey = new WeakMap(), _KryptonWalletAccount_chains = new WeakMap(), _KryptonWalletAccount_features = new WeakMap(), _KryptonWalletAccount_label = new WeakMap(), _KryptonWalletAccount_icon = new WeakMap();
//# sourceMappingURL=account.js.map