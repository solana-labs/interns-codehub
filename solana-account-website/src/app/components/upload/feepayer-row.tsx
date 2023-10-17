import { useWallet } from "@solana/wallet-adapter-react";
import CopyToClipboard from "../helpers/copy";
import Tooltip from "../helpers/tooltip";

const FeePayerRow = () => {
	const { publicKey } = useWallet();

	return (
		<div className="grid grid-flow-row auto-rows-min grid-cols-1 sm:grid-cols-12">
			<div className="flex flex-row pb-1 sm:pb-0 col-span-5 items-center text-sm sm:font-bold sm:text-base lg:text-lg text-left text-violet-700 dark:text-solana-purple">
				<span>Fee Payer Wallet</span>
				<span className="flex sm:hidden w-fit py-1 pl-2 text-stone-500 dark:text-stone-200">
					:
				</span>
				<Tooltip
					message={
						<span className="text-xs font-normal">
							This is the <code>PublicKey</code> of the wallet you are currently
							signed in with
						</span>
					}
					condition={true}
					classes={`block md:hidden w-28 right-0 top-7`}
				>
					<svg
						className="block md:hidden ml-2 w-4 h-4 text-emerald-500 dark:text-solana-green group-hover:text-emerald-700 dark:hover:text-emerald-600 group-focus:text-emerald-700 dark:focus:text-emerald-600"
						fill="none"
						stroke="currentColor"
						strokeWidth={1.5}
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
						/>
					</svg>
				</Tooltip>
			</div>
			<div className="w-fit hidden col-span-1 sm:flex sm:p-1 lg:p-2 text-stone-500 dark:text-stone-200">
				:
			</div>
			<div className="pb-5 sm:pb-0 w-full items-center flex col-span-6">
				{publicKey ? (
					<>
						<p className="hidden md:block break-words leading-7 align-middle text-xs lg:text-base text-stone-500 dark:text-stone-200">
							{publicKey.toBase58()}
						</p>
						<button
							title="click to copy"
							onClick={() =>
								navigator.clipboard.writeText(publicKey.toBase58())
							}
							className="w-full h-full md:hidden text-stone-500 dark:text-stone-200 appearance-none outline-none hover:text-violet-700 dark:hover:text-solana-purple focus:text-violet-700 dark:focus:text-solana-purple"
						>
							<p className="text-left text-xs lg:text-base break-words sm:break-normal">
								{publicKey.toBase58()}
							</p>
						</button>
						<CopyToClipboard
							message={publicKey.toBase58()}
							classes="hidden md:block"
						/>
						<Tooltip
							message={
								<>
									This is the <code>PublicKey</code> of the wallet you are
									currently signed in with
								</>
							}
							condition={true}
							classes={`hidden md:block w-28 right-0 top-7 xl:top-0 xl:left-9`}
						>
							<svg
								className="hidden md:block w-4 h-4 lg:w-5 lg:h-5 text-emerald-500 dark:text-solana-green group-hover:text-emerald-700 dark:hover:text-emerald-600 group-focus:text-emerald-700 dark:focus:text-emerald-600"
								fill="none"
								stroke="currentColor"
								strokeWidth={1.5}
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
								/>
							</svg>
						</Tooltip>
					</>
				) : (
					<p className="text-xs md:text-sm lg:text-base text-rose-500 break-words">
						Please sign-in as the fee payer wallet to continue...
					</p>
				)}
			</div>
		</div>
	);
};

export default FeePayerRow;
