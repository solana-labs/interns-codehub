import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import Logo from "public/favicon.ico";
import { ClusterSelect } from "./cluster/cluster-select";

const WalletButtonDynamic = dynamic(() => import("./wallet/wallet-button"), {
	ssr: false,
});

const Navbar = () => {
	return (
		<nav className="container mx-auto py-5">
			<div className="w-full flex flex-col gap-3 md:gap-0 items-center sm:justify-end md:inline-flex md:flex-row">
				<Link
					className="text-5xl sm:text-3xl lg:text-4xl flex font-bold sm:mr-auto ml-2 text-transparent bg-clip-text bg-gradient-to-tr from-violet-700 dark:from-solana-purple to-emerald-500 dark:to-solana-green dark:outline-none focus:ring-2 focus:ring-violet-700 dark:focus:ring-solana-purple outline-none"
					href={`/`}
				>
					<span className="h-full flex items-center justify-center">
						Sol
						<Image
							src={Logo}
							alt="logo"
							className="h-9 w-9 sm:h-6 sm:w-6 lg:h-7 lg:w-7 object-bottom"
						/>
					</span>
					<p className="hidden sm:flex">{` : `}</p>
					<p className="hidden sm:flex pl-2 text-2xl lg:text-3xl self-center">
						A
						<span className="pl-2 underline underline-offset-3 decoration-emerald-500 dark:decoration-solana-green">
							Sol
						</span>
						ana
						<span className="pl-2 underline underline-offset-3 decoration-emerald-500 dark:decoration-solana-green">
							D
						</span>
						ata Editor
					</p>
				</Link>
				<div className="flex flex-col gap-2 xs:flex-row xs:gap-0 xs:justify-between w-full px-3 md:px-0 md:w-fit">
					<WalletButtonDynamic className="h-full w-full xs:w-36 sm:w-44 text-xs sm:text-sm mr-1 sm:mr-3 px-1 sm:px-2 py-1 text-white bg-solana-purple rounded-md hover:bg-violet-700 dark:hover:bg-solana-purple/70 focus:bg-violet-700 dark:focus:bg-solana-purple/70 [&:not([disabled]):hover]:bg-violet-700 dark:[&:not([disabled]):hover]:bg-solana-purple/70 [&:not([disabled]):focus]:bg-violet-700 dark:[&:not([disabled]):focus]:bg-solana-purple/70 hover:text-stone-100 focus:text-stone-100 disabled:bg-stone-700 disabled:hover:text-stone-100 disabled:focus:text-stone-100 focus:outline-none dark:focus:outline-none" />
					<ClusterSelect />
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
