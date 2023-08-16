import Router from 'next/router'

export default function PositionLiquidityIndexPage() {
	const { pathname } = Router
	if (pathname == '/position/amm') {
		Router.push('/position')
	}
	return <></>
}