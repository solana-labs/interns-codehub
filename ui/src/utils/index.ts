import BN from 'bn.js'
import Decimal from 'decimal.js'

export * from './jupiter'
export * from './tick'
export * from './tick-arrays'
export * from './token-math'

export const isBase58 = (value: string): boolean => /^[A-HJ-NP-Za-km-z1-9]*$/.test(value);

export function formatNumber(num: string | number | BN | Decimal, decimals: number = 2) {
  const _num = typeof num === 'bigint' || typeof num === 'string' ? Number(num) : typeof num === 'number' ? num : num.toString()
  return _num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  // const formatter = Intl.NumberFormat('en', {
  //   maximumFractionDigits: 2,
  //   minimumFractionDigits: 2,
  // })
  // return formatter.format(_num)
}

export function truncatedAddress(str: string) {
  // Truncate middle
  return str.substring(0, 6) + '...' + str.substring(str.length - 6, str.length);
}
