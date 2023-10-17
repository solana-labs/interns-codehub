import { displaySize, MAX_FILE_SIZE } from "@/app/utils/utils";
import { Dispatch, SetStateAction } from "react";
import Tooltip from "../helpers/tooltip";

const DynamicRow = ({
	isDynamic,
	setIsDynamic,
	space,
	setSpace,
}: {
	isDynamic: boolean;
	setIsDynamic: Dispatch<SetStateAction<boolean>>;
	space: number;
	setSpace: Dispatch<SetStateAction<number>>;
}) => {
	return (
		<>
			<div className="hidden sm:grid sm:grid-cols-12">
				<div className="flex flex-row col-span-5 items-center font-bold text-base lg:text-lg text-left text-violet-700 dark:text-solana-purple">
					<span>Dynamic/Static + Initial Size</span>
				</div>
				<div className="w-fit col-span-1 flex p-1 lg:p-2 text-stone-500 dark:text-stone-200">
					:
				</div>
				<div className="pb-0 flex flex-row h-full items-center col-span-6">
					<input
						type="checkbox"
						checked={isDynamic}
						onChange={() => setIsDynamic((prev) => !prev)}
						className="mr-2 w-3 h-3 md:w-4 md:h-4 accent-emerald-500 dark:accent-solana-green hover:ring-violet-700 dark:hover:ring-solana-purple hover:ring-2 focus:ring-2 focus:ring-violet-700 dark:focus:ring-solana-purple"
					/>
					<input
						type="number"
						required
						aria-required
						min={0}
						max={MAX_FILE_SIZE}
						className="text-black text-xs md:text-sm lg:text-base px-1 bg-white dark:bg-stone-200 rounded-sm focus:outline-none shadow-sm focus-widivin:ring-2 hover:ring-violet-700 focus:ring-violet-700 ring-2 ring-stone-500 dark:hover:ring-solana-purple dark:focus:ring-solana-purple dark:ring-stone-400 invalid:ring-rose-700"
						value={space}
						onChange={(e) => {
							const num = Number(e.target.value);
							if (isNaN(num) || num < 0) {
								setSpace(0);
							} else {
								setSpace(Number(e.target.value));
							}
						}}
					/>
					<Tooltip
						message={
							<>
								<b>{isDynamic ? "Dynamic" : "Static"}</b>
								<br />
								Initial size:
								<br />
								{displaySize(space)}
								<br />
								{space > MAX_FILE_SIZE ? (
									<p className="text-rose-700">{`> ${
										MAX_FILE_SIZE / 1e6
									} MB`}</p>
								) : null}
							</>
						}
						condition={true}
						classes={`w-28 right-0 top-7 md:top-5 lg:top-0 lg:left-9`}
					>
						<svg
							className="ml-2 w-4 h-4 lg:w-5 lg:h-5 text-emerald-500 dark:text-solana-green group-hover:text-emerald-700 dark:hover:text-emerald-600 group-focus:text-emerald-700 dark:focus:text-emerald-600"
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
			</div>
			<div className="flex flex-col sm:hidden">
				<div className="flex flex-row items-center text-sm text-left text-violet-700 dark:text-solana-purple">
					<span>Dynamic/Static</span>
					<span className="flex w-fit py-1 pl-2 text-stone-500 dark:text-stone-200">
						:
					</span>
				</div>
				<div className="pb-4 flex flex-row h-full items-center">
					<div className="h-3 flex items-center">
						<input
							type="checkbox"
							checked={isDynamic}
							onChange={() => setIsDynamic((prev) => !prev)}
							className="mr-2 w-3 h-full accent-emerald-500 dark:accent-solana-green hover:ring-violet-700 dark:hover:ring-solana-purple hover:ring-2 focus:ring-2 focus:ring-violet-700 dark:focus:ring-solana-purple"
						/>
					</div>
					<span className="text-sm text-emerald-600 dark:text-emerald-500">
						{isDynamic ? "Dynamic" : "Static"}
					</span>
				</div>
				<div className="flex flex-row h-full pb-1 items-center text-sm text-left text-violet-700 dark:text-solana-purple">
					<span>Initial Size</span>
					<span className="flex w-fit py-1 pl-2 text-stone-500 dark:text-stone-200">
						:
					</span>
				</div>
				<div className="pb-4 flex flex-row h-full items-center">
					<input
						type="number"
						required
						aria-required
						min={0}
						max={MAX_FILE_SIZE}
						className="text-black text-xs px-1 bg-white dark:bg-stone-200 rounded-sm focus:outline-none shadow-sm focus-widivin:ring-2 hover:ring-violet-700 focus:ring-violet-700 ring-2 ring-stone-500 dark:hover:ring-solana-purple dark:focus:ring-solana-purple dark:ring-stone-400 invalid:ring-rose-700"
						value={space}
						onChange={(e) => {
							const num = Number(e.target.value);
							if (isNaN(num) || num < 0) {
								setSpace(0);
							} else {
								setSpace(Number(e.target.value));
							}
						}}
					/>
					<Tooltip
						message={
							<>
								Initial size:
								<br />
								{displaySize(space)}
								<br />
								{space > MAX_FILE_SIZE ? (
									<p className="text-rose-700">{`> ${
										MAX_FILE_SIZE / 1e6
									} MB`}</p>
								) : null}
							</>
						}
						condition={true}
						classes={`w-28 right-0 top-7 md:top-5 lg:top-0 lg:left-9`}
					>
						<svg
							className="ml-2 w-4 h-4 lg:w-5 lg:h-5 text-emerald-500 dark:text-solana-green group-hover:text-emerald-700 dark:hover:text-emerald-600 group-focus:text-emerald-700 dark:focus:text-emerald-600"
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
			</div>
		</>
	);
};

export default DynamicRow;
