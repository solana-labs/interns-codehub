export function tickToPrice(tick: number, decimalA: number = 9, decimalB: number = 9): number {
  return Math.pow(1.0001, tick) * (10 ** (decimalA - decimalB))
}