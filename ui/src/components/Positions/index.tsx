import { useWallet } from "@solana/wallet-adapter-react";

interface PositionsProps {
  className?: string;
}

export default function Positions(props: PositionsProps) {
  const { publicKey } = useWallet();

  // const positionData = useGlobalStore((state) => state.positionData);

  // if (positionData.status === "pending") {
  //   return <LoadingSpinner className="text-4xl" />;
  // }

  // if (!publicKey) {
  //   return (
  //     <div className={props.className}>
  //       <header className="mb-5 flex items-center space-x-4">
  //         <div className="font-medium text-white">My Positions</div>
  //       </header>

  //       <NoPositions emptyString="No Open Positions" />
  //     </div>
  //   );
  // }

  return (
    <div className={props.className}>
			Positions
      {/* <header className="mb-5 flex items-center space-x-4">
        <div className="font-medium text-white">My Positions</div>
        {positionData.status === "pending" && (
          <LoadingDots className="text-white" />
        )}
      </header>
      <ExistingPositions /> */}
    </div>
  );
}