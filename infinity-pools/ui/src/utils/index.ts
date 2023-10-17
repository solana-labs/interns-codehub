import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { intervalToDuration, formatDuration } from 'date-fns'
import Decimal from 'decimal.js'

export * from './jupiter'
export * from './tick'
export * from './tick-arrays'
export * from './token-math'
export * from './tokenUtl'

export const isBase58 = (value: string): boolean => /^[A-HJ-NP-Za-km-z1-9]*$/.test(value);

export function formatNumber(num: string | number | BN | Decimal, minDecimals: number = 2, maxDecimals: number = 6) {
  const _num = typeof num === 'bigint' || typeof num === 'string' ? parseFloat(num) : typeof num === 'number' ? num : parseFloat(num.toString())
  const formatter = Intl.NumberFormat('en', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  })
  return formatter.format(_num)
}

export function truncatedAddress(str: string) {
  // Truncate middle
  return str.substring(0, 6) + '...' + str.substring(str.length - 6, str.length);
}

export const zeroPad = (num: number | string) => String(num).padStart(2, "0")

export function formatSecondsToDurationString(seconds: number) {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 })
  return formatDuration(duration, { format: ['months', 'weeks', 'days', 'hours'] })
}

export function numToDecimal(num: number | string | BN | Decimal): Decimal {
  return typeof num === 'bigint' || typeof num === 'string' || typeof num === 'number' ? new Decimal(num) : num instanceof BN ? new Decimal(num.toString()) : num
}

// Scale number to decimal exponent, e.g. 100 USDC => 100 * 10^6 => 100000000
export function numScaledToDecimals(num: number | string | BN | Decimal, decimals: number) {
  return numToDecimal(num).mul(new Decimal(10).pow(decimals)).toString()
}

// Scale number from decimal exponent, e.g. 100000000 => 100000000 / 10^6 => 100 USDC
export function numScaledFromDecimals(num: number | string | BN | Decimal, decimals: number) {
  return numToDecimal(num).div(new Decimal(10).pow(decimals)).toString()
}

export function strOrBnToBn(num: string | BN) {
  return typeof num === 'string' ? new BN(num) : num
}

export function strOrBnToString(num: string | BN) {
  return typeof num === 'string' ? num : num.toString()
}

export function strOrPubkeyToPubkey(strOrPubkey: string | PublicKey) {
  return typeof strOrPubkey === 'string' ? new PublicKey(strOrPubkey) : strOrPubkey
}

export function strOrPubkeyToString(strOrPubkey: string | PublicKey) {
  return typeof strOrPubkey === 'string' ? strOrPubkey : strOrPubkey.toString()
}