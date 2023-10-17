import { Keypair, PublicKey } from "@solana/web3.js";
import { getPubkey, signMessage } from "bloss-js";
import nacl from "tweetnacl";

interface Signer {
    getPublicKey(): Promise<PublicKey>,
    signMessage(message: Uint8Array): Promise<Uint8Array>
}

export class KeypairSigner implements Signer {
    public keypair: Keypair;

    constructor(keypair: Keypair) {
        this.keypair = keypair;
    }

    async getPublicKey(): Promise<PublicKey> {
        return this.keypair.publicKey;
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      const secretKey = this.keypair.secretKey;
      const sig = nacl.sign.detached(message, secretKey);
      return sig;
    }
}

export class YubikeySigner implements Signer {
    private aid: string;
    private pin: string = "123456";
    private getPin: (isRetry: boolean) => Promise<string>;
    private touchPrompt: () => void;
    private afterTouchCallback: () => void;

    /**
     * Create a new Yubikey signer.
     *
     * @param aid OpenPGP AID that uniquely specifies the Yubikey
     * @param getPin an async callback that collects the Yubikey pin from the user
     * @param touchPrompt called when the Yubikey expects touch confirmation from the user.
     *     For example, open a dialog in the UI saying "Touch your Yubikey..."
     * @param afterTouchCallback called once touch confirmation is established.
     *     For example, to close the "Touch your Yubikey..." dialog
     */
    constructor(
        aid: string,
        getPin: (isRetry: boolean) => Promise<string>,
        touchPrompt: () => void,
        afterTouchCallback: () => void,
    ) {
        this.aid = aid;
        this.getPin = getPin;
        this.touchPrompt = touchPrompt;
        this.afterTouchCallback = afterTouchCallback;
    }

    async getPublicKey(): Promise<PublicKey> {
        return new PublicKey(await getPubkey(this.aid));
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        let firstTry = true;
        const encoder = new TextEncoder();
        while (true) {
            if (!firstTry) {
                this.pin = await this.getPin(!firstTry);
            }
            const pin = encoder.encode(this.pin);
            try {
                const sig = await signMessage(this.aid, message, pin, this.touchPrompt);
                this.afterTouchCallback();
                return sig;
            } catch (e: any) {
                if (Object.hasOwn(e, "type") && e.type === "InvalidPin") {
                    firstTry = false;
                    continue;
                }
                throw e;
            }
        }
    }
}

export type StandardAccount = KeypairSigner & {
    name: string;
    pk: string;
    pda: string;
    avatar?: string;
};

export type YubikeyAccount = YubikeySigner & {
    name: string;
    pk: string;
    pda: string;
    avatar?: string;
    manufacturer: string;
}

export type KryptonAccount = StandardAccount | YubikeyAccount;

export type {Signer}