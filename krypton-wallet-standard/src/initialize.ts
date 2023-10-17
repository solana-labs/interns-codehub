import { registerWallet } from './register.js';
import { KryptonWallet } from './wallet.js';
import type { Krypton } from './window.js';

export function initialize(krypton: Krypton): void {
    registerWallet(new KryptonWallet(krypton));
}
