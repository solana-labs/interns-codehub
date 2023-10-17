const BLOSS_NATIVE_NAME = "com.harrisluo.bloss_native";

export interface PgpCardInfo {
    manufacturer: string,
    serialNumber: string,
    aid: string,
    signingAlgo: string,
    pubkeyBytes: Uint8Array,
}

export interface BlossError {
    aid: string,
    type: string,
    details: any,
}

export const listCards = async (): Promise<PgpCardInfo[]> => {
    console.log("Getting cards...");
    const promise = new Promise<PgpCardInfo[]>((resolve, reject) => {
        chrome.runtime.sendNativeMessage(
            BLOSS_NATIVE_NAME,
            {command: "ListCards"},
            (response) => {
                console.log(response);
                if (response.Ok) {
                    const cards = response.Ok.ListCards.map(parsePgpCardInfo);
                    resolve(cards);
                } else {
                    reject(wrapError(response.Error));
                }
            }
        );
    })
    return promise;
}

export const getPubkey = async (aid: string): Promise<Uint8Array> => {
    console.log("Getting pubkey...");
    const promise = new Promise<Uint8Array>((resolve, reject) => {
        chrome.runtime.sendNativeMessage(
            BLOSS_NATIVE_NAME,
            {command: { GetPubkey: { aid: aid } }},
            (response) => {
                console.log(response);
                if (response.Ok) {
                    const respData = response.Ok.GetPubkey as GetPubkeyResponse;
                    const pubkeyBytes = new Uint8Array(respData.pubkey);
                    resolve(pubkeyBytes);
                } else {
                    reject(wrapError(response.Error));
                }
            }
        );
    })
    return promise;
} 

export const signMessage = async (
    aid: string,
    message: Uint8Array,
    pin: Uint8Array,
    touch_callback: (aid: string) => void,
): Promise<Uint8Array> => {
    console.log(`Signing message...`);
    const promise = new Promise<Uint8Array>((resolve, reject) => {
        const port = chrome.runtime.connectNative(BLOSS_NATIVE_NAME);
        port.onMessage.addListener((response) => {
            console.log(response);
            if (response.Ok) {
                const respType = Object.keys(response.Ok)[0];
                if (respType === "AwaitTouch") {
                    const respData = response.Ok.AwaitTouch as AwaitTouchResponse;
                    touch_callback(respData.aid);
                } else {
                    const respData = response.Ok.SignMessage as SignMessageResponse;
                    const sigBytes = new Uint8Array(respData.signature);
                    resolve(sigBytes);
                    port.disconnect();
                }
            } else {
                reject(wrapError(response.Error));
                port.disconnect();
            }
        });
        port.onDisconnect.addListener(function () {
            console.log('Disconnected');
        });
        port.postMessage({command: { SignMessage: {
            aid,
            message: Array.from(message),
            pin: Array.from(pin)
        }}});
    })
    return promise;
};

interface GetPubkeyResponse {
    aid: string,
    pubkey: Array<number>,
}

interface AwaitTouchResponse {
    aid: string,
}

interface SignMessageResponse {
    aid: string,
    signature: Array<number>,
}

interface ErrorResponse {
    aid: string,
    details: any,
}

const parsePgpCardInfo = (data: any): PgpCardInfo => {
    data.pubkeyBytes = new Uint8Array(data.pubkeyBytes);
    return data;
}

const wrapError = (e: ErrorResponse): BlossError => {
    if (typeof e.details === "string") {
        return {
            aid: e.aid,
            type: e.details,
            details: null,
        };
    } else {
        const etype = Object.keys(e.details)[0];
        return {
            aid: e.aid,
            type: etype,
            details: e.details[etype],
        };
    }
}
