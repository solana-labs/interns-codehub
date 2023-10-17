import { Link } from 'react-router-dom';
import { KeyIcon } from "@heroicons/react/20/solid";
import { PgpCardInfo } from 'bloss-js';
import bs58 from 'bs58';

export const CardItem = ({ cardInfo, linkOn }: { cardInfo: PgpCardInfo, linkOn: boolean }) => {
    const styles = linkOn ? "flex grid-cols-2 gap-x-2 rounded-md bg-emerald-200 hover:bg-emerald-600 p-2 bg-opacity-10 hover:bg-opacity-80" :
        "flex grid-cols-2 gap-x-2 rounded-md bg-emerald-600 p-2 bg-opacity-80";
    const content = <div className={styles}>
        <div className="flex grid-cols-1 place-content-center">
            <KeyIcon className="w-16"></KeyIcon>
        </div>
        <div>
            <h2 className="text-xl font-semibold">{cardInfo.manufacturer} Card (no. {cardInfo.serialNumber})</h2>
            <p className="text-md text-stone-300"><span className="font-bold">OpenPGP AID:</span> {cardInfo.aid}</p>
            <p className="text-md text-stone-300"><span className="font-bold">Signing algorithm:</span> {cardInfo.signingAlgo}</p>
            <p className="text-md text-stone-300"><span className="font-bold">Public key:</span> {bs58.encode(cardInfo.pubkeyBytes)}</p>
        </div>
    </div>;
    if (linkOn) {
        return <Link to="/sign" state={{cardInfo: cardInfo}}>{content}</Link>;
    } else {
        return content;
    }
};
