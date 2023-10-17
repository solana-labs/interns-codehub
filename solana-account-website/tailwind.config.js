/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class",
	content: [
		"./app/**/*.{js,ts,jsx,tsx}",
		"./pages/**/*.{js,ts,jsx,tsx}",
		"./components/**/*.{js,ts,jsx,tsx}",

		// Or if using `src` directory:
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				"solana-purple": "#9945FF",
				"solana-blue": "#03E1FF",
				"solana-green": "#14F195",
			},
			screens: {
				xs: "350px",
			},
		},
	},
	plugins: [],
};
