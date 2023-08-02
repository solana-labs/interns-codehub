import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { sortObjectByQuotePriority } from '@/lib/Token'
import { useMemo } from 'react'

type TradePositionRenderToken = {
  pubkey: PublicKey
  symbol: string
  decimals: number
}

type TradePositionRenderColors = {
  color0: string
  color1: string
  color2: string
  color3: string
}

type TradePositionRenderProps = {
  positionKey: PublicKey
  tickLowerIndex: number
  tickUpperIndex: number
  tickCurrentIndex: number
  tickSpacing: number
  loanTokenSwapped: BN
  tokenLoan: TradePositionRenderToken
  tokenCollateral: TradePositionRenderToken
  colors?: TradePositionRenderColors
}

// constant
const bgCoord = {
  x1: 145, x2: 175, x3: 205,
  y1: 145, y2: 175, y3: 205
}

export default function TradePositionRender(props: TradePositionRenderProps) {
  const {
    positionKey,
    tickLowerIndex,
    tickUpperIndex,
    tickCurrentIndex,
    tickSpacing,
    loanTokenSwapped,
    tokenCollateral,
    tokenLoan,
  } = props

  const colors = props.colors || {
    color0: '#433799',
    color1: '#11101E',
    color2: '#58A0DB',
    color3: '#C59FFB',
  }

  const [baseToken, quoteToken] = useMemo(() => [tokenCollateral, tokenLoan].sort(sortObjectByQuotePriority('pubkey')), [tokenCollateral, tokenLoan])
  const curve = useMemo(() => getCurve(tickLowerIndex, tickUpperIndex, tickSpacing), [tickLowerIndex, tickUpperIndex, tickSpacing])
  const overRange = tickLowerIndex > tickCurrentIndex ? 1 : tickUpperIndex < tickCurrentIndex ? -1 : 0

  if (!baseToken || !quoteToken) return (<></>)

  return (
    <svg width="290" height="500" viewBox="0 0 290 500" xmlns="http://www.w3.org/2000/svg" xmlnsXlink='http://www.w3.org/1999/xlink'>
      {generateSVGDefs(colors)}
      {generateSVGBorderWithText(baseToken, quoteToken, colors)}
      {generateSVGCardMantle(loanTokenSwapped)}
      {generageSvgCurve(overRange, curve)}
      {generateSVGCurveCircle(overRange)}
      {generateSVGPositionDataAndLocationCurve(positionKey, tickLowerIndex, tickUpperIndex)}
    </svg>
  )
}

function generateSVGDefs(colors: TradePositionRenderColors) {
  const base64EncodeFirst = Buffer.from(`<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><rect width='290px' height='500px' fill="${colors.color0}" /></svg>`, 'utf8').toString('base64')
  const base64EncodeSecond = Buffer.from(`<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><circle cx="${bgCoord.x1}" cy="${bgCoord.y1}" r="120px" fill="${colors.color1}" /></svg>`, 'utf8').toString('base64')
  const base64EncodeThird = Buffer.from(`<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><circle cx="${bgCoord.x2}" cy="${bgCoord.y2}" r="120px" fill="${colors.color2}" /></svg>`, 'utf8').toString('base64')
  const base64EncodeFourth = Buffer.from(`<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><circle cx="${bgCoord.x3}" cy="${bgCoord.y3}" r="100px" fill="${colors.color3}" /></svg>`, 'utf8').toString('base64')

  return (
    <defs>
      <filter id="f1">
        <feImage result="p0" xlinkHref={`data:image/svg+xml;base64,${base64EncodeFirst}`} />
        <feImage result="p1" xlinkHref={`data:image/svg+xml;base64,${base64EncodeSecond}`} />
        <feImage result="p2" xlinkHref={`data:image/svg+xml;base64,${base64EncodeThird}`} />
        <feImage result="p3" xlinkHref={`data:image/svg+xml;base64,${base64EncodeFourth}`} />
        <feBlend mode="overlay" in="p0" in2="p1" />
        <feBlend mode="exclusion" in2="p2" />
        <feBlend mode="overlay" in2="p3" result="blendOut" />
        <feGaussianBlur in="blendOut" stdDeviation="42" />
      </filter>
      <clipPath id="corners"><rect width="290" height="500" rx="42" ry="42" />
      </clipPath>
      <path id="text-path-a" d="M40 12 H250 A28 28 0 0 1 278 40 V460 A28 28 0 0 1 250 488 H40 A28 28 0 0 1 12 460 V40 A28 28 0 0 1 40 12 z" />
      <path id="minimap" d="M234 444C234 457.949 242.21 463 253 463" />
      <filter id="top-region-blur"><feGaussianBlur in="SourceGraphic" stdDeviation="24" /></filter>
      <linearGradient id="grad-up" x1="1" x2="0" y1="1" y2="0">
        <stop offset="0.0" stopColor="white" stopOpacity="1" />
        <stop offset=".9" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="grad-down" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0.0" stopColor="white" stopOpacity="1" />
        <stop offset="0.9" stopColor="white" stopOpacity="0" />
      </linearGradient>',
      <mask id="fade-up" maskContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill="url(#grad-up)" />
      </mask>
      <mask id="fade-down" maskContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill="url(#grad-down)" />
      </mask>
      <mask id="none" maskContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill="white" />
      </mask>
      <linearGradient id="grad-symbol">
        <stop offset="0.7" stopColor="white" stopOpacity="1" />
        <stop offset=".95" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <mask id="fade-symbol" maskContentUnits="userSpaceOnUse">
        <rect width="290px" height="200px" fill="url(#grad-symbol)" />
      </mask>
    </defs>
  )
}

function generateSVGBorderWithText(baseToken: TradePositionRenderToken, quoteToken: TradePositionRenderToken, colors: TradePositionRenderColors) {
  const baseTokenStr = `${baseToken.pubkey.toBase58()} • ${baseToken.symbol}`
  const quoteTokenStr = `${quoteToken.pubkey.toBase58()} • ${quoteToken.symbol}`
  return (
    <>
      {/* border line */}
      <g clipPath="url(#corners)">
        <rect fill={colors.color0} x="0px" y="0px" width="290px" height="500px" />
        <rect style={{ filter: 'url(#f1)' }} x="0px" y="0px" width="290px" height="500px" />
        <g style={{ filter: 'url(#top-region-blur)', transform: 'scale(1.5)', transformOrigin: 'center top' }}>
          <rect fill="none" x="0px" y="0px" width="290px" height="500px" />
          <ellipse cx="50%" cy="0px" rx="180px" ry="120px" fill="#000" opacity="0.85" />
        </g>
        <rect x="0" y="0" width="290" height="500" rx="42" ry="42" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" />
      </g>

      {/* border text */}
      <text textRendering="optimizeSpeed">
        <textPath startOffset="-100%" fill="white" fontFamily="\'Courier New\', monospace" fontSize="10px" xlinkHref="#text-path-a">
          {baseTokenStr}
          <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />
        </textPath>
        <textPath startOffset="0%" fill="white" fontFamily="\'Courier New\', monospace" fontSize="10px" xlinkHref="#text-path-a">
          {baseTokenStr}
          <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />
        </textPath>
        <textPath startOffset="50%" fill="white" fontFamily="\'Courier New\', monospace" fontSize="10px" xlinkHref="#text-path-a">
          {quoteTokenStr}
          <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />
        </textPath>
        <textPath startOffset="-50%" fill="white" fontFamily="\'Courier New\', monospace" fontSize="10px" xlinkHref="#text-path-a">
          {quoteTokenStr}
          <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />
        </textPath>
      </text>
    </>
  )
}

function generateSVGCardMantle(loanTokenSwapped: BN) {
  return (
    <g mask="url(#fade-symbol)">
      <rect fill="none" x="0px" y="0px" width="290px" height="200px" />
      <text y="70px" x="32px" fill="white" fontFamily="\'Courier New\', monospace" fontWeight="200" fontSize="36px">
        SOL / USDC
      </text>
      <text y="115px" x="32px" fill="white" fontFamily="\'Courier New\', monospace" fontWeight="200" fontSize="36px">
        {loanTokenSwapped.div(new BN(10 ** 6)).toString()}
      </text>
      <rect x="16" y="16" width="258" height="468" rx="26" ry="26" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" />
    </g>
  )
}

function generageSvgCurve(overRange: number, curve: ReturnType<typeof getCurve>) {
  const fade = overRange === 1 ? '#fade-up' : overRange === -1 ? '#fade-down' : '#none';
  return (
    <>
      <g mask={`url(${fade})`} style={{ transform: 'translate(72px,189px)' }}>
        <rect x="-16px" y="-16px" width="180px" height="180px" fill="none" />
        <path d={curve} stroke="rgba(0,0,0,0.3)" strokeWidth="32px" fill="none" strokeLinecap="round" />
      </g>

      <g mask={`url(${fade})`} style={{ transform: 'translate(72px,189px)' }}>
        <rect x="-16px" y="-16px" width="180px" height="180px" fill="none" />
        <path d={curve} stroke="rgba(255,255,255,1)" fill="none" strokeLinecap="round" />
      </g>
    </>
  )
}

function generateSVGCurveCircle(overRange: number) {
  const [curveX1, curveX2] = ['73px', '217px']
  const [curveY1, curveY2] = ['190px', '334px']
  const overR = overRange === 1
  const underR = overRange === -1
  if (overR || underR) return `<circle cx="${underR ? curveX1 : curveX2}" cy="${underR ? curveY1 : curveY2}" r="4px" fill="white" /><circle cx="${underR ? curveX1 : curveX2}" cy="${underR ? curveY1 : curveY2}" r="24px" fill="none" stroke="white" />`
  return `<circle cx="${curveX1}" cy="${curveY1}" r="4px" fill="white" /><circle cx="${curveX2}" cy="${curveY2}" r="4px" fill="white" />`
}

function generateSVGPositionDataAndLocationCurve(positionKey: PublicKey, tickLowerIndex: number, tickUpperIndex: number) {
  const positionKeyStr = positionKey.toBase58().slice(0, 6) + '..' + positionKey.toBase58().slice(-6)
  const tickLowerStr = tickLowerIndex.toString()
  const tickUpperStr = tickUpperIndex.toString()
  const str1length = positionKeyStr.length + 4
  const str2length = tickLowerStr.length + 10
  const str3length = tickUpperStr.length + 10
  const [xCoord, yCoord] = rangeLocation(tickLowerIndex, tickUpperIndex)

  return (
    <>
      <g style={{ transform: 'translate(29px, 384px)' }}>
        <rect width={`${(7 * (str1length + 4)).toString()}px`} height="26px" rx="8px" ry="8px" fill="rgba(0,0,0,0.6)" />
        <text x="12px" y="17px" font-family="\'Courier New\', monospace" font-size="12px" fill="white">
          <tspan fill="rgba(255,255,255,0.6)">ID: </tspan>
          {positionKeyStr}
        </text>
      </g>

      <g style={{ transform: 'translate(29px, 414px)' }} >
        <rect width={`${(7 * (str2length + 4)).toString()}px`} height="26px" rx="8px" ry="8px" fill="rgba(0,0,0,0.6)" />
        <text x="12px" y="17px" font-family="\'Courier New\', monospace" font-size="12px" fill="white">
          <tspan fill="rgba(255,255,255,0.6)">Min Tick: </tspan>
          {tickLowerIndex.toLocaleString()}
        </text>
      </g>

      <g style={{ transform: 'translate(29px, 444px)' }}>
        <rect width={`${(7 * (str3length + 4)).toString()}px`} height="26px" rx="8px" ry="8px" fill="rgba(0,0,0,0.6)" />
        <text x="12px" y="17px" font-family="\'Courier New\', monospace" font-size="12px" fill="white">
          <tspan fill="rgba(255,255,255,0.6)">Max Tick: </tspan>
          {tickUpperIndex.toLocaleString()}
        </text>
      </g>

      <g style={{ transform: 'translate(226px, 433px)' }}>
        <rect width="36px" height="36px" rx="8px" ry="8px" fill="none" stroke="rgba(255,255,255,0.2)" />
        <path stroke-linecap="round" d="M8 9C8.00004 22.9494 16.2099 28 27 28" fill="none" stroke="white" />
        <circle style={{ transform: `translate3d(${xCoord}px, ${yCoord}px, 0px)` }} cx="0px" cy="0px" r="4px" fill="white" />
      </g>
    </>
  )
}

function getCurve(tickLowerIndex: number, tickUpperIndex: number, tickSpacing: number) {
  const tickRange = (tickUpperIndex - tickLowerIndex) / tickSpacing
  if (tickRange <= 4) return 'M1 1C41 41 105 105 145 145' // curve1
  else if (tickRange <= 8) return 'M1 1C33 49 97 113 145 145' // curve2
  else if (tickRange <= 16) return 'M1 1C33 57 89 113 145 145' // curve3
  else if (tickRange <= 32) return 'M1 1C25 65 81 121 145 145' // curve4
  else if (tickRange <= 64) return 'M1 1C17 73 73 129 145 145' // curve5
  else if (tickRange <= 128) return 'M1 1C9 81 65 137 145 145' // curve6
  else if (tickRange <= 256) return 'M1 1C1 89 57.5 145 145 145' // curve7
  return 'M1 1C1 97 49 145 145 145' // curve8
}

function rangeLocation(tickLower: number, tickUpper: number) {
  const midPoint = (tickLower + tickUpper) / 2;
  if (midPoint < -125_000) return ['8', '7']
  else if (midPoint < -75_000) return ['8', '10.5']
  else if (midPoint < -25_000) return ['8', '14.25']
  else if (midPoint < -5_000) return ['10', '18']
  else if (midPoint < 0) return ['11', '21']
  else if (midPoint < 5_000) return ['13', '23']
  else if (midPoint < 25_000) return ['15', '25']
  else if (midPoint < 75_000) return ['18', '26']
  else if (midPoint < 125_000) return ['21', '27']
  else return ['24', '27']
}