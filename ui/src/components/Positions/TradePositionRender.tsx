import { PublicKey } from '@solana/web3.js'
import { BN } from 'bn.js'

import { GlobalpoolData } from '@/types/accounts'
import { UserTradePosition } from '@/types/user'

type TradePositionRenderProps = {
  position: UserTradePosition
  globalpool?: GlobalpoolData
  mintADecimals?: number,
  mintBDecimals?: number,
}

const styleTokens = { font: 'bold 30px sans-serif' }
const styleFee = { font: 'normal 26px sans-serif' }
const styleTick = { font: 'normal 18px sans-serif' }

const color0 = '#433799'
const color1 = '#11101E'
const color2 = '#58A0DB'
const color3 = '#C59FFB'

const coord = {
  x1: 145,
  x2: 250,
  x3: 365,
  y1: 145,
  y2: 250,
  y3: 365
}

const curve1 = 'M1 1C41 41 105 105 145 145';
const curve2 = 'M1 1C33 49 97 113 145 145';
const curve3 = 'M1 1C33 57 89 113 145 145';
const curve4 = 'M1 1C25 65 81 121 145 145';
const curve5 = 'M1 1C17 73 73 129 145 145';
const curve6 = 'M1 1C9 81 65 137 145 145';
const curve7 = 'M1 1C1 89 57.5 145 145 145';
const curve8 = 'M1 1C1 97 49 145 145 145';

const base64EncodeFirst = Buffer.from(`<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><rect width='290px' height='500px' fill="${color0}" /></svg>`, 'utf8').toString('base64')

const base64EncodeSecond = Buffer.from(`<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><circle cx="${coord.x1}" cy="${coord.y1}" r="120px" fill="${color1}" /></svg>`, 'utf8').toString('base64')

const base64EncodeThird = Buffer.from(`<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><circle cx="${coord.x2}" cy="${coord.y2}" r="120px" fill="${color2}" /></svg>`, 'utf8').toString('base64')

const base64EncodeFourth = Buffer.from(`<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><circle cx="${coord.x3}" cy="${coord.y3}" r="100px" fill="${color3}" /></svg>`, 'utf8').toString('base64')

const tickSpacing = 64 // TODO: load from globalpool

export default function TradePositionRender(props: TradePositionRenderProps) {
  const { position: userPosition, globalpool, mintADecimals, mintBDecimals } = props

  const position = userPosition.data
  const positionKey = userPosition.key
  const positionKeyStr = positionKey.toBase58().slice(0, 6) + '..' + positionKey.toBase58().slice(-6)

  const baseToken = position.tokenMintLoan
  const baseTokenSymbol = 'SOL'

  const quoteToken = position.tokenMintCollateral
  const quoteTokenSymbol = 'USDC'

  // TODO use globalpool data
  const overRange = 1

  const fade = overRange == 1 ? '#fade-up' : overRange == -1 ? '#fade-down' : '#none';

  const tickRange = (position.tickUpperIndex - position.tickLowerIndex) / tickSpacing
  let curve = curve8 // else
  if (tickRange <= 4) {
    curve = curve1
  } else if (tickRange <= 8) {
    curve = curve2
  } else if (tickRange <= 16) {
    curve = curve3
  } else if (tickRange <= 32) {
    curve = curve4
  } else if (tickRange <= 64) {
    curve = curve5
  } else if (tickRange <= 128) {
    curve = curve6
  } else if (tickRange <= 256) {
    curve = curve7
  }

  const tickLowerStr = position.tickLowerIndex.toString()
  const tickUpperStr = position.tickUpperIndex.toString()
  const str1length = positionKeyStr.length + 4;
  const str2length = tickLowerStr.length + 10;
  const str3length = tickUpperStr.length + 10;
  const [xCoord, yCoord] = rangeLocation(position.tickLowerIndex, position.tickUpperIndex);

  return (
    <svg width="290" height="500" viewBox="0 0 290 500" xmlns="http://www.w3.org/2000/svg" xmlnsXlink='http://www.w3.org/1999/xlink'>

      {/* generateSVGCardMantle */}

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

      {/* generateSVGBorderWithText */}

      <g clipPath="url(#corners)">
        <rect fill={color0} x="0px" y="0px" width="290px" height="500px" />
        <rect style={{ filter: 'url(#f1)' }} x="0px" y="0px" width="290px" height="500px" />
        <g style={{ filter: 'url(#top-region-blur)', transform: 'scale(1.5)', transformOrigin: 'center top' }}>
          <rect fill="none" x="0px" y="0px" width="290px" height="500px" />
          <ellipse cx="50%" cy="0px" rx="180px" ry="120px" fill="#000" opacity="0.85" />
        </g>
        <rect x="0" y="0" width="290" height="500" rx="42" ry="42" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" />
      </g>

      <text textRendering="optimizeSpeed">
        <textPath startOffset="-100%" fill="white" fontFamily="\'Courier New\', monospace" fontSize="10px" xlinkHref="#text-path-a">
          {`${baseToken.toBase58()} • ${baseTokenSymbol}`}
          <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />
        </textPath>
        <textPath startOffset="0%" fill="white" fontFamily="\'Courier New\', monospace" fontSize="10px" xlinkHref="#text-path-a">
          {`${baseToken.toBase58()} • ${baseTokenSymbol}`}
          <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />
        </textPath>
        <textPath startOffset="50%" fill="white" fontFamily="\'Courier New\', monospace" fontSize="10px" xlinkHref="#text-path-a">
          {`${quoteToken.toBase58()} • ${quoteTokenSymbol}`}
          <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />
        </textPath>
        <textPath startOffset="-50%" fill="white" fontFamily="\'Courier New\', monospace" fontSize="10px" xlinkHref="#text-path-a">
          {`${quoteToken.toBase58()} • ${quoteTokenSymbol}`}
          <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />
        </textPath>
      </text>

      {/* generateSVGCardMantle */}

      <g mask="url(#fade-symbol)">
        <rect fill="none" x="0px" y="0px" width="290px" height="200px" />
        <text y="70px" x="32px" fill="white" fontFamily="\'Courier New\', monospace" fontWeight="200" fontSize="36px">
          SOL / USDC
        </text>
        <text y="115px" x="32px" fill="white" fontFamily="\'Courier New\', monospace" fontWeight="200" fontSize="36px">
          {position.loanTokenSwapped.div(new BN(10 ** 6)).toString()}
        </text>
        <rect x="16" y="16" width="258" height="468" rx="26" ry="26" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" />
      </g>

      {/* generageSvgCurve */}

      <g mask={`url(${fade})`} style={{ transform: 'translate(72px,189px)' }}>
        <rect x="-16px" y="-16px" width="180px" height="180px" fill="none" />
        <path d={curve} stroke="rgba(0,0,0,0.3)" strokeWidth="32px" fill="none" strokeLinecap="round" />
      </g>

      <g mask={`url(${fade})`} style={{ transform: 'translate(72px,189px)' }}>
        <rect x="-16px" y="-16px" width="180px" height="180px" fill="none" />
        <path d={curve} stroke="rgba(255,255,255,1)" fill="none" strokeLinecap="round" />
      </g>

      {generateSVGCurveCircle(overRange)}

      {/* generateSVGPositionDataAndLocationCurve */}

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
          {tickLowerStr}
        </text>
      </g>

      <g style={{ transform: 'translate(29px, 444px)' }}>
        <rect width={`${(7 * (str3length + 4)).toString()}px`} height="26px" rx="8px" ry="8px" fill="rgba(0,0,0,0.6)" />
        <text x="12px" y="17px" font-family="\'Courier New\', monospace" font-size="12px" fill="white">
          <tspan fill="rgba(255,255,255,0.6)">Max Tick: </tspan>
          {tickUpperStr}
        </text>
      </g>

      <g style={{ transform: 'translate(226px, 433px)' }}>
        <rect width="36px" height="36px" rx="8px" ry="8px" fill="none" stroke="rgba(255,255,255,0.2)" />
        <path stroke-linecap="round" d="M8 9C8.00004 22.9494 16.2099 28 27 28" fill="none" stroke="white" />
        <circle style={{ transform: `translate3d(${xCoord}px, ${yCoord}px, 0px)` }} cx="0px" cy="0px" r="4px" fill="white" />
      </g>

    </svg>
  )
}

function generateSVGCurveCircle(overRange: number) {
  const curveX1 = '73px'
  const curveX2 = '217px'
  const curveY1 = '190px'
  const curveY2 = '334px'
  if (overRange == 1 || overRange == -1) {
    return `<circle cx="${overRange == -1 ? curveX1 : curveX2}" cy="${overRange == -1 ? curveY1 : curveY2}" r="4px" fill="white" /><circle cx="${overRange == -1 ? curveX1 : curveX2}" cy="${overRange == -1 ? curveY1 : curveY2}" r="24px" fill="none" stroke="white" />`
  }
  return `<circle cx="${curveX1}" cy="${curveY1}" r="4px" fill="white" /><circle cx="${curveX2}" cy="${curveY2}" r="4px" fill="white" />`
}

function rangeLocation(tickLower: number, tickUpper: number) {
  const midPoint = (tickLower + tickUpper) / 2;
  if (midPoint < -125_000) {
    return ['8', '7']
  } else if (midPoint < -75_000) {
    return ['8', '10.5']
  } else if (midPoint < -25_000) {
    return ['8', '14.25']
  } else if (midPoint < -5_000) {
    return ['10', '18']
  } else if (midPoint < 0) {
    return ['11', '21']
  } else if (midPoint < 5_000) {
    return ['13', '23']
  } else if (midPoint < 25_000) {
    return ['15', '25']
  } else if (midPoint < 75_000) {
    return ['18', '26']
  } else if (midPoint < 125_000) {
    return ['21', '27']
  } else {
    return ['24', '27']
  }
}