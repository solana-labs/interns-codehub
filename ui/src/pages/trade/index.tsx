import Router from 'next/router'

export default function TradeIndexPage() {
  const { pathname } = Router
  if (pathname == '/trade') {
    Router.push('/trade/HNT-USDC')
  }

  return <></>;
}