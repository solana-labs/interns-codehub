import Link from "next/link";

const DataRow = ({ url, classes }: { url: string; classes?: string }) => {
	return (
		<div
			className={`grid grid-flow-row auto-rows-min grid-cols-1 sm:grid-cols-12 ${classes}`}
		>
			<div className="flex flex-row pb-1 sm:pb-0 col-span-3 items-center text-sm sm:font-bold sm:text-base lg:text-lg text-left text-violet-700 dark:text-solana-purple">
				<span>Data</span>
				<span className="flex sm:hidden w-fit py-1 pl-2 text-stone-500 dark:text-stone-200">
					:
				</span>
			</div>
			<div className="w-fit hidden col-span-1 sm:flex sm:p-1 lg:p-2 text-stone-500 dark:text-stone-200">
				:
			</div>
			<div className="pb-4 sm:pb-0 flex items-center col-span-8">
				<Link
					className="flex items-start w-fit text-xs lg:text-sm font-semibold bg-solana-purple text-white px-1 lg:px-2 py-0.5 lg:py-1 rounded-md ring-violet-700 hover:bg-violet-700 dark:ring-solana-purple/70 dark:hover:bg-solana-purple/70 hover:text-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-700 dark:focus:ring-solana-purple/70"
					href={url}
					target="_blank"
				>
					VIEW ORIGINAL
					<span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.75}
							stroke="currentColor"
							className="w-3 h-3 lg:w-4 lg:h-4 ml-1"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
							/>
						</svg>
					</span>
				</Link>
			</div>
		</div>
	);
};

export default DataRow;
