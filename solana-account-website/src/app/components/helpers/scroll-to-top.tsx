import { useEffect, useState } from "react";

export const ScrollToTop = () => {
	const [isVisible, setIsVisible] = useState(false);

	const toggleVisibility = () => {
		if (window.pageYOffset > 300) {
			setIsVisible(true);
		} else {
			setIsVisible(false);
		}
	};

	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	};

	useEffect(() => {
		window.addEventListener("scroll", toggleVisibility);

		return () => {
			window.removeEventListener("scroll", toggleVisibility);
		};
	}, []);

	return (
		<div className="fixed bottom-5 right-5">
			<button
				type="button"
				onClick={scrollToTop}
				className={`${
					isVisible ? "opacity-100" : "opacity-0"
				} text-stone-800 dark:text-stone-200 bg-stone-300 dark:bg-stone-700 hover:bg-white dark:hover:bg-stone-900 hover:text-violet-700 dark:hover:text-solana-purple focus:bg-white dark:focus:bg-stone-900 focus:text-violet-700 dark:focus:text-solana-purple focus:ring-violet-700 dark:focus:ring-solana-purple inline-flex items-center rounded-full p-1 xs:p-2 md:p-3 shadow-lg transition-opacity focus:outline-none focus:ring-1 ease-in-out duration-100`}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M4.5 15.75l7.5-7.5 7.5 7.5"
					/>
				</svg>
			</button>
		</div>
	);
};
