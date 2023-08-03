import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { useMemo } from 'react'

import { sortObjectByQuotePriority } from '@/lib/Token'

export enum PositionRenderCardSize {
  BIG,
  SMALL
}

export type PositionRenderToken = {
  pubkey: PublicKey
  symbol: string
  decimals: number
}

export type PositionRenderBgCoord = {
  x1: number
  x2: number
  x3: number
  y1: number
  y2: number
  y3: number
}

export type PositionRenderColors = {
  color0: string
  color1: string
  color2: string
  color3: string
}

export const POSITION_DEFAULT_RENDER_COLORS: PositionRenderColors = {
  color0: '#433799',
  color1: '#11101E',
  color2: '#58A0DB',
  color3: '#C59FFB',
}

export type PositionRenderCardProps = {
  positionKey: PublicKey
  tickLowerIndex: number
  tickUpperIndex: number
  tickOpenIndex: number // current index at the time of position creation
  tickCurrentIndex: number // current index of the globalpool
  tickSpacing: number
  amount: BN | number | string
  tokenA?: PositionRenderToken
  tokenB?: PositionRenderToken
  colors?: PositionRenderColors
  size?: PositionRenderCardSize
}

export default function PositionRenderCustomizableCard(props: PositionRenderCardProps) {
  const {
    positionKey,
    tickLowerIndex,
    tickUpperIndex,
    tickOpenIndex,
    tickCurrentIndex,
    tickSpacing,
    amount,
    tokenA,
    tokenB,
  } = props

  const colors = props.colors || POSITION_DEFAULT_RENDER_COLORS
  const size = props.size || PositionRenderCardSize.BIG
  const { WIDTH, HEIGHT } = parseSize(size)

  const [baseToken, quoteToken] = useMemo(() => {
    if (!tokenA || !tokenB) return [undefined, undefined]
    return [tokenA, tokenB].sort(sortObjectByQuotePriority('pubkey'))
  }, [tokenA, tokenB])
  const curve = useMemo(() => getCurve(tickLowerIndex, tickUpperIndex, tickSpacing), [tickLowerIndex, tickUpperIndex, tickSpacing])
  const overRange = tickLowerIndex > tickCurrentIndex ? 1 : tickUpperIndex < tickCurrentIndex ? -1 : 0
  const isLong = tickUpperIndex < tickOpenIndex

  if (!baseToken || !quoteToken) return (<></>)

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} xmlns="http://www.w3.org/2000/svg" xmlnsXlink='http://www.w3.org/1999/xlink'>
      {generateSVGDefs(colors, size)}
      {generateSVGBorderWithText(baseToken, quoteToken, colors, size)}
      {generateSVGCardMantle(amount, size, isLong)}
      {size === PositionRenderCardSize.BIG && generageSvgCurve(overRange, curve)}
      {generateSVGCurveCircle(overRange)}
      {generateSVGPositionDataAndLocationCurve(positionKey, tickLowerIndex, tickUpperIndex, size)}
    </svg>
  )
}

function parseSize(size?: PositionRenderCardSize) {
  const _size = size || PositionRenderCardSize.BIG
  return {
    WIDTH: _size === PositionRenderCardSize.BIG ? 290 : 290,
    HEIGHT: _size === PositionRenderCardSize.BIG ? 500 : 290,
    bgCoord: (_size === PositionRenderCardSize.BIG ? {
      x1: 145, x2: 175, x3: 205,
      y1: 145, y2: 175, y3: 205
    } : {
      x1: 115, x2: 130, x3: 145,
      y1: 115, y2: 130, y3: 145
    }) as PositionRenderBgCoord
  }
}

function generateSVGDefs(colors: PositionRenderColors, size: PositionRenderCardSize) {
  const { WIDTH, HEIGHT, bgCoord } = parseSize(size)
  const clipCorner = 42
  const fadeHeight = size === PositionRenderCardSize.BIG ? '240px' : '160px'
  const b64r = size === PositionRenderCardSize.BIG ? 120 : 80

  const base64EncodeFirst = Buffer.from(`<svg width='${WIDTH}' height='${HEIGHT}' viewBox='0 0 ${WIDTH} ${HEIGHT}' xmlns='http://www.w3.org/2000/svg'><rect width='${WIDTH}px' height='${HEIGHT}px' fill="${colors.color0}" /></svg>`, 'utf8').toString('base64')
  const base64EncodeSecond = Buffer.from(`<svg width='${WIDTH}' height='${HEIGHT}' viewBox='0 0 ${WIDTH} ${HEIGHT}' xmlns='http://www.w3.org/2000/svg'><circle cx="${bgCoord.x1}" cy="${bgCoord.y1}" r="${b64r}px" fill="${colors.color1}" /></svg>`, 'utf8').toString('base64')
  const base64EncodeThird = Buffer.from(`<svg width='${WIDTH}' height='${HEIGHT}' viewBox='0 0 ${WIDTH} ${HEIGHT}' xmlns='http://www.w3.org/2000/svg'><circle cx="${bgCoord.x2}" cy="${bgCoord.y2}" r="${b64r}px" fill="${colors.color2}" /></svg>`, 'utf8').toString('base64')
  const base64EncodeFourth = Buffer.from(`<svg width='${WIDTH}' height='${HEIGHT}' viewBox='0 0 ${WIDTH} ${HEIGHT}' xmlns='http://www.w3.org/2000/svg'><circle cx="${bgCoord.x3}" cy="${bgCoord.y3}" r="${b64r * 0.8}px" fill="${colors.color3}" /></svg>`, 'utf8').toString('base64')

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
        <feGaussianBlur in="blendOut" stdDeviation={clipCorner} />
      </filter>
      <clipPath id="corners">
        <rect width={WIDTH} height={HEIGHT} rx={clipCorner} ry={clipCorner} />
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
        <rect width={`${WIDTH}px`} height={fadeHeight} fill="url(#grad-symbol)" />
      </mask>
    </defs>
  )
}

function generateSVGBorderWithText(baseToken: PositionRenderToken, quoteToken: PositionRenderToken, colors: PositionRenderColors, size: PositionRenderCardSize) {
  const baseTokenStr = `${baseToken.pubkey.toBase58()} • ${baseToken.symbol}`
  const quoteTokenStr = `${quoteToken.pubkey.toBase58()} • ${quoteToken.symbol}`
  const { WIDTH, HEIGHT } = parseSize(size)
  const ellipse = size === PositionRenderCardSize.BIG ? { rx: '180px', ry: '120px' } : { rx: '120px', ry: '80px' }
  const rectOffset = size === PositionRenderCardSize.BIG ? 42 : 32

  return (
    <>
      <g clipPath="url(#corners)">
        <rect fill={colors.color0} x="0px" y="0px" width={`${WIDTH}px`} height={`${HEIGHT}px`} />
        <rect style={{ filter: 'url(#f1)' }} x="0px" y="0px" width={`${WIDTH}px`} height={`${HEIGHT}px`} />
        <g style={{ filter: 'url(#top-region-blur)', transform: 'scale(1.5)', transformOrigin: 'center top' }}>
          <rect fill="none" x="0px" y="0px" width={`${WIDTH}px`} height={`${HEIGHT}px`} />
          <ellipse cx="50%" cy="0px" rx={ellipse.rx} ry={ellipse.ry} fill="#000" opacity="0.85" />
        </g>
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx={rectOffset} ry={rectOffset} fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" />
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

function generateSVGCardMantle(amount: BN | number | string, size: PositionRenderCardSize, isLong: boolean) {
  const { WIDTH } = parseSize(size)
  const fadeHeight = size === PositionRenderCardSize.BIG ? '240px' : '160px'
  const fontSize = size === PositionRenderCardSize.BIG ? '36px' : '24px'
  const textX = size === PositionRenderCardSize.BIG ? '32px' : '24px'
  const textY = size === PositionRenderCardSize.BIG ? { one: '70px', two: '115px' } : { one: '60px', two: '100px' }
  
  const fromTop = 32
  const fromLeft = size === PositionRenderCardSize.BIG ? 32 : 25

  const directionText = isLong ? 'LONG' : 'SHORT'
  const directionColor = isLong ? 'rgba(81, 189, 68, 0.8)' : 'rgba(239, 98, 81, 0.8)'

  return (
    <g mask="url(#fade-symbol)">
      <rect fill="none" x="0px" y="0px" width={`${WIDTH}px`} height={fadeHeight} />

      <g style={{ transform: xyToTranslatePx(fromLeft, fromTop) }}>
        <rect width={`${(7 * (directionText.length + 3)).toString()}px`} height="24px" rx="11px" ry="11px" fill={directionColor} />
        <text x="7px" y="18px" fontFamily="\'Courier New\', monospace" fontSize="15px" fill="white">
          {directionText}
        </text>
      </g>

      <g style={{ transform: xyToTranslatePx(0, fromTop) }}>
        <text y={textY.one} x={textX} fill="white" fontFamily="\'Courier New\', monospace" fontWeight="200" fontSize={fontSize}>
          SOL / USDC
        </text>
        <text y={textY.two} x={textX} fill="white" fontFamily="\'Courier New\', monospace" fontWeight="200" fontSize={fontSize}>
          {amount.toLocaleString()}
        </text>
      </g>

      {/* white border line */}
      {size === PositionRenderCardSize.BIG && <rect x="16" y="16" width="258" height="468" rx="26" ry="26" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" />}
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

function xyToTranslatePx(x: number, y: number) {
  return 'translate(' + x + 'px, ' + y + 'px)'
}

function generateSVGPositionDataAndLocationCurve(positionKey: PublicKey, tickLowerIndex: number, tickUpperIndex: number, size: PositionRenderCardSize) {
  const positionKeyStr = positionKey.toBase58().slice(0, 6) + '..' + positionKey.toBase58().slice(-6)
  const tickLowerStr = tickLowerIndex.toLocaleString()
  const tickUpperStr = tickUpperIndex.toLocaleString()
  const str1length = positionKeyStr.length + 4
  const str2length = tickLowerStr.length + 10
  const str3length = tickUpperStr.length + 10
  const [xCoord, yCoord] = rangeLocation(tickLowerIndex, tickUpperIndex)

  const fromTop = size === PositionRenderCardSize.BIG ? 384 : 180
  const fromLeft = 29

  // Big fromTop: 384px, 414px, 444px, 433px
  // Big fromLEft: 29, 29, 29, 226

  return (
    <>
      <g style={{ transform: xyToTranslatePx(fromLeft, fromTop) }}>
        <rect width={`${(7 * (str1length + 4)).toString()}px`} height="26px" rx="8px" ry="8px" fill="rgba(0,0,0,0.6)" />
        <text x="12px" y="17px" fontFamily="\'Courier New\', monospace" fontSize="12px" fill="white">
          <tspan fill="rgba(255,255,255,0.6)">ID: </tspan>
          {positionKeyStr}
        </text>
      </g>

      <g style={{ transform: xyToTranslatePx(fromLeft, fromTop + 30) }} >
        <rect width={`${(7 * (str2length + 4)).toString()}px`} height="26px" rx="8px" ry="8px" fill="rgba(0,0,0,0.6)" />
        <text x="12px" y="17px" fontFamily="\'Courier New\', monospace" fontSize="12px" fill="white">
          <tspan fill="rgba(255,255,255,0.6)">Min Tick: </tspan>
          {tickLowerIndex.toLocaleString()}
        </text>
      </g>

      <g style={{ transform: xyToTranslatePx(fromLeft, fromTop + 60) }}>
        <rect width={`${(7 * (str3length + 4)).toString()}px`} height="26px" rx="8px" ry="8px" fill="rgba(0,0,0,0.6)" />
        <text x="12px" y="17px" fontFamily="\'Courier New\', monospace" fontSize="12px" fill="white">
          <tspan fill="rgba(255,255,255,0.6)">Max Tick: </tspan>
          {tickUpperIndex.toLocaleString()}
        </text>
      </g>

      <g style={{ transform: xyToTranslatePx(226, fromTop + 50) }}>
        <rect width="36px" height="36px" rx="8px" ry="8px" fill="none" stroke="rgba(255,255,255,0.2)" />
        <path strokeLinecap="round" d="M8 9C8.00004 22.9494 16.2099 28 27 28" fill="none" stroke="white" />
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