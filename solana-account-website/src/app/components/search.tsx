"use client";

import { useCluster } from "@/app/utils/utils";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import Tooltip from "./helpers/tooltip";

export const Search = () => {
	const PREFIX = "sol://";
	const pathname = usePathname();
	const [search, setSearch] = useState(PREFIX + pathname?.substring(1));
	const { cluster } = useCluster();

	const isUpload = pathname?.substring(1) === "upload";

	const router = useRouter();
	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const dataPK = search.substring(PREFIX.length);
		if (dataPK === "upload" && !isUpload) {
			router.push(`/upload`);
		} else if (dataPK) {
			router.push(`${dataPK}?cluster=${cluster}`);
		} else {
			setSearch(PREFIX);
		}
	};

	useEffect(() => setSearch(PREFIX + pathname?.substring(1)), [pathname]);

	const focusRef = useRef<HTMLInputElement>(null);

	return (
		<form className="px-3 lg:px-0" onSubmit={handleSubmit}>
			<div className="w-full flex items-center bg-white dark:bg-stone-200 focus-within:ring-2 hover:ring-violet-700 focus-within:ring-violet-700 dark:hover:ring-solana-purple dark:focus-within:ring-solana-purple rounded-sm ring-2 ring-stone-500 dark:ring-stone-400 shadow-sm">
				<input
					className="bg-transparent focus:outline-none focus:ring-0 appearance-none w-full text-sm xs:text-base md:text-lg py-1 md:py-2 pl-0.5 xs:pl-1 md:pl-2 caret-violet-700 dark:caret-solana-purple"
					type="text"
					ref={focusRef}
					aria-label="Search for data accounts"
					value={search}
					onChange={(e) => {
						if (e.target.value.startsWith(PREFIX)) {
							setSearch(PREFIX + e.target.value.substring(PREFIX.length));
						}
					}}
				/>
				<button
					type="reset"
					className="h-full p-1 md:p-2 rounded-sm text-stone-500 hover:text-rose-700 focus:text-rose-700 focus:outline-none"
					onClick={() => {
						setSearch(PREFIX);
						focusRef.current?.focus();
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="1.5"
						stroke="currentColor"
						className="w-3 h-3 xs:w-4 xs:h-4 md:w-5 md:h-5"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
				<Tooltip
					message={
						<>
							&quot;<b>upload</b>&quot; is not a valid <code>PublicKey</code>
						</>
					}
					condition={search.substring(PREFIX.length) === "upload" && isUpload}
					classes="top-11 right-0 w-24"
				>
					<button
						type="submit"
						disabled={search.substring(PREFIX.length) === "upload" && isUpload}
						className="h-full px-2 md:px-3 py-0.5 xs:py-1 md:py-2 rounded-sm border-l-2 border-stone-500 dark:border-stone-400 text-stone-500 hover:text-violet-700 dark:hover:text-solana-purple focus:text-violet-700 dark:focus:text-solana-purple focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-800 dark:disabled:text-stone-500"
					>
						<svg
							aria-hidden="true"
							className="w-3 h-3 xs:w-4 xs:h-4 md:w-5 md:h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</button>
				</Tooltip>
			</div>
		</form>
	);
};
