import Router from 'next/router'

export default function PositionTradeIndexPage() {
	const { pathname } = Router
	if (pathname == '/position/trade') {
		Router.push('/position')
	}
	return <></>
}