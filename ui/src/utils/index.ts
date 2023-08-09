import BN from 'bn.js'
import { intervalToDuration, formatDuration } from 'date-fns'
import Decimal from 'decimal.js'

export * from './jupiter'
export * from './tick'
export * from './tick-arrays'
export * from './token-math'

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