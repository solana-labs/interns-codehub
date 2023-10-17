import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import bs58 from 'bs58';
import { CardItem } from "../components/CardItem";
import { signMessage, BlossError, getPubkey } from "bloss-js";
import { FingerPrintIcon } from "@heroicons/react/20/solid";

export const CardSign = () => {
    const { cardInfo } = useLocation().state;
    const [signature, setSignature] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [pin, setPin] = useState<string>("");
    const [pinInvalid, setPinInvalid] = useState<boolean>(false);
    const [awaitingTouch, setAwaitingTouch] = useState<boolean>(false);

    useEffect(() => {
        getPubkey(
            cardInfo.aid,
        ).then(pubkeyBytes => {
            const pk = bs58.encode(pubkeyBytes);
            console.log(pk);
        }).catch((e: BlossError) => {
            alert(JSON.stringify(e));
        });
    }, []);

    if (awaitingTouch) {
        return <div className="grid grid-rows-auto gap-y-3 p-4 text-stone-100">
            <h1 className="text-3xl text-center font-semibold pb-4">Sign Message with PGP Card</h1>
            <CardItem cardInfo={cardInfo} linkOn={false} />
            <div className="flex grid-cols-2 gap-x-4 px-4 place-content-center items-center my-4 text-stone-200">
                <div className="w-10 flex-none grid-cols-1 place-content-center">
                    <FingerPrintIcon className="w-10"></FingerPrintIcon>
                </div>
                <h1 className="flex-none text-lg text-center font-semibold">Touch your smart card to confirm...</h1>
            </div>
        </div>
    } else {
        return <div className="grid grid-rows-auto gap-y-3 p-4 text-stone-100">
            <h1 className="text-3xl text-center font-semibold pb-4">Sign Message with PGP Card</h1>
            <CardItem cardInfo={cardInfo} linkOn={false} />
            <textarea
                className="w-full h-40 text-md text-gray-50 font-mono rounded-md p-2 bg-stone-700
                        focus:outline-none focus:border border-emerald-500 border-opacity-80"
                placeholder="Message"
                value={message}
                onInput={e => setMessage((e.target as HTMLTextAreaElement).value)}
            ></textarea>
            <div className="flex items-center gap-x-2">
                <label className="flex-none text-md text-stone-100">Card PIN:</label>
                <input
                    className={`flex-1 text-md text-gray-50 font-mono rounded-md p-2 bg-stone-700
                                focus:outline-none focus:border ${pinInvalid ? "border border-red-500" : "border-emerald-500"} border-opacity-80`}
                    type="password"
                    value={pin}
                    onInput={e => setPin((e.target as HTMLInputElement).value)}
                ></input>
            </div>
            <button
                className="w-full text-lg p-2 rounded-md
                        bg-emerald-200 hover:bg-emerald-600 bg-opacity-10 hover:bg-opacity-80"
                onClick={() => {
                    signMessage(
                        cardInfo.aid,
                        new Uint8Array(new TextEncoder().encode(message)),
                        new Uint8Array(new TextEncoder().encode(pin)),
                        () => setAwaitingTouch(true),
                    ).then((sigBytes: Uint8Array) => {
                        setPin("");
                        setPinInvalid(false);
                        setAwaitingTouch(false);
                        const sigBase58 = bs58.encode(sigBytes);
                        setSignature(sigBase58);
                    }).catch((e: BlossError) => {
                        setPin("");
                        setAwaitingTouch(false);

                        if (e.type === "InvalidPin") {
                            setPinInvalid(true);
                        } else if (e.type === "TouchConfirmationTimeout") {
                            alert("Touch confirmation timed out. Please try again.");
                        } else {
                            alert(JSON.stringify(e));
                        }
                    });
                }}
            >Sign</button>
            <textarea
                className="w-full h-18 text-md text-gray-50 font-mono rounded-md p-2 bg-stone-700
                        select-text"
                placeholder="Signature"
                value={signature}
                disabled={true}
            ></textarea>
        </div>
    }
};
