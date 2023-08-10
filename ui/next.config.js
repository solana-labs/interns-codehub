/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		// !! WARN !!
		// Dangerously allow production builds to successfully complete even if
		// your project has type errors.
		// !! WARN !!
		ignoreBuildErrors: true,
	},
	// reactStrictMode: true,
  // swcMinify: true,

	webpack: (config, { isServer }) => {
    if (!isServer) {
			// Anchor relies on `fs` so we skip it on browser (since we don't use Anchor's NodeWallet)
      config.resolve.fallback.fs = false
    }
    return config
  },

	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'assets.coingecko.com',
				port: '',
				pathname:'/coins/images/**',
			}
		]
	}

	// publicRuntimeConfig: {
	// 	NEXT_PUBLIC_SOLANA_RPC_MAINNET: process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET,
	// }
}

module.exports = nextConfig
