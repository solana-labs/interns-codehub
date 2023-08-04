import BN from 'bn.js'

export * from './jupiter'
export * from './tick'
export * from './tick-arrays'
export * from './token-math'

export const isBase58 = (value: string): boolean => /^[A-HJ-NP-Za-km-z1-9]*$/.test(value);

export function formatNumber(num: string | number | BN) {
  const _num = typeof num === 'bigint' || typeof num === 'string' ? Number(num) : typeof num === 'number' ? num : num.toString()
  return _num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  // const formatter = Intl.NumberFormat('en', {
  //   maximumFractionDigits: 2,
  //   minimumFractionDigits: 2,
  // })
  // return formatter.format(_num)
}
