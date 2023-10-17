import { useEffect, useState } from "react";

const DarkModeSwitch = () => {
	const [darkMode, setDarkMode] = useState(() => {
		if (typeof window != "undefined") {
			if (
				localStorage.getItem("theme") === "light" ||
				(!("theme" in localStorage) &&
					window.matchMedia("(prefers-color-scheme: light)").matches)
			) {
				return false;
			} else {
				return true;
			}
		}
	});

	useEffect(() => {
		if (darkMode) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
	}, [darkMode]);

	return (
		<button
			className={`relative flex flex-row w-10 h-4 md:w-11 md:h-5 rounded-full p-0.5 items-center justify-between group outline-none border-2 bg-transparent border-stone-500 hover:border-violet-700 dark:hover:border-solana-purple ease-in-out duration-200 focus:border-violet-700 dark:focus:border-solana-purple shadow-inner hover:cursor-pointer hover:text-violet-700 focus:text-violet-700 dark:hover:text-solana-purple/80 dark:focus:text-solana-purple/80`}
			onClick={() => setDarkMode((d) => !d)}
		>
			<div
				className={`absolute left-0.5 z-10 h-full w-4 md:w-[1.14rem] rounded-full bg-stone-500 group-hover:bg-violet-700 dark:group-hover:bg-solana-purple ease-in-out duration-200 group-focus:bg-violet-700 dark:group-focus:bg-solana-purple ${
					darkMode && "translate-x-[1.15rem]"
				}`}
			/>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth={1.5}
				stroke="currentColor"
				className="w-3 h-3 md:w-4 md:h-4"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
				/>
			</svg>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth={1.5}
				className="w-3 h-3 md:w-4 md:h-4"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
				/>
			</svg>
		</button>
	);
};

export default DarkModeSwitch;
