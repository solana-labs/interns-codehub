import { useEffect, useState } from "react"
import { CardItem } from "../components/CardItem";
import { listCards, PgpCardInfo } from "bloss-js";

export const CardList = () => {
    const [cards, setCards] = useState<PgpCardInfo[]>([]);
    useEffect(
        () => {
            listCards().then((cards: PgpCardInfo[]) => {
                setCards(cards);
            }).catch((e) => {
                alert(e)
            });
        },
        [],
    );
    const cardItems = cards.map((cardInfo: PgpCardInfo) => <CardItem cardInfo={cardInfo} linkOn={true} />)

    return <div className="p-4 text-stone-100">
        <h1 className="text-3xl text-center font-semibold pb-4">Select Card</h1>
        { cards.length > 0
          ?
          <div className="grid grid-rows-1 gap-y-3">{cardItems}</div>
          :
          <h2 className="text-xl text-center pb-2 text-stone-300">No cards found.</h2>
        }
    </div>
};
