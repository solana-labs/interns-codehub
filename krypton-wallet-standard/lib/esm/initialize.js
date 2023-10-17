import { registerWallet } from './register.js';
import { KryptonWallet } from './wallet.js';
export function initialize(krypton) {
    registerWallet(new KryptonWallet(krypton));
}
//# sourceMappingURL=initialize.js.map