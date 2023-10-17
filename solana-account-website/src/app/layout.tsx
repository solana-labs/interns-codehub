"use client";

import { ReactNode } from "react";
import Footer from "./components/footer";
import { ScrollToTop } from "./components/helpers/scroll-to-top";
import Navbar from "./components/navbar";
import { Search } from "./components/search";
import "./globals.css";
import ContextProviders from "./providers";

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="scroll-smooth">
			<head />
			<body className="min-h-screen flex flex-col font-sans bg-stone-100 dark:bg-stone-800 justify-center transition-200 ease-in-out">
				<ContextProviders>
					<Navbar />
					<main className="container mx-auto sm:my-3 flex-1 flex flex-col">
						<section className="w-full h-full container mx-auto md:pt-5">
							<Search />
						</section>
						<section className="grow w-full h-full flex flex-col mt-5 mx-auto px-3 lg:px-0 content-center justify-content-center text-sky-500 dark:text-solana-blue">
							{children}
						</section>
					</main>
					<ScrollToTop />
					<Footer />
				</ContextProviders>
			</body>
		</html>
	);
}
