/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		appDir: true,
	},
	images: {
		dangerouslyAllowSVG: true,
		remotePatterns: [
			{
				hostname: "localhost",
			},
		],
	},
};

module.exports = nextConfig;
