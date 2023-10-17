export function tickToPrice(tick: number, decimalA: number = 9, decimalB: number = 9): number {
  // price = 1.0001^{tick} * 10^{decimals}
  return Math.pow(1.0001, tick) * (10 ** (decimalA - decimalB))
}

/**
 * Convert price to nearest tick.
 * @param {number} price Price to convert.
 * @param {number} tickSpacing Tick spacing of the pool.
 * @param {number} Decimal of Base token (A)
 * @param {number} Decimal of Quote token (B)
 * @return Tick
*/
export function priceToNearestTick(price: number, tickSpacing: number, decimalA = 9, decimalB = 6) {
  // price = 1.0001^{tick} * 10^{decimals}
  // tick = ln(price * 10^{-decimals}) / ln(1.0001)
  const rawTick = Math.log(price / Math.pow(10, decimalA - decimalB)) / Math.log(1.0001)
  return Math.round(rawTick / tickSpacing) * tickSpacing;
}

export function getPositionRange(lowerTick: number, upperTick: number, currentTick: number, tokenNameA = 'TOKEN A', tokenNameB = 'TOKEN B') {
  if (lowerTick > upperTick) {
    throw new Error('Invalid lower tick over upper tick');
  }
  if (lowerTick == currentTick && upperTick == currentTick) {
    throw new Error('Lower & upper ticks are the same as the current tick');
  }
  if (upperTick > currentTick && lowerTick < currentTick) return 'IN-BETWEEN';
  if (upperTick < currentTick) return `ALL in ${tokenNameB}`;
  if (lowerTick > currentTick) return `ALL in ${tokenNameA}`;
  return 'IN-BETWEEN';
}

/**
 * Extracts the first number sequence from string.
 * @param {string} str
 * @return number
 */
export function numFromStr(str: number | string) {
  // in-line: VALUE(REGEXREPLACE(cell,"[^[:digit:]]", ""))
  // @ts-ignore
  return typeof str == 'number' ? str : Number(str.match(/[\d.]+/)[0]);
}

export function calcAmountX(liquidity: number, currentPrice: number, upperPrice: number) {
  const sqrtPc = Math.sqrt(currentPrice);
  const sqrtPb = Math.sqrt(upperPrice);
  return liquidity * (sqrtPb - sqrtPc) / (sqrtPc * sqrtPb);
}

export function calcAmountY(liquidity: number, currentPrice: number, lowerPrice: number) {
  const sqrtPc = Math.sqrt(currentPrice);
  const sqrtPa = Math.sqrt(lowerPrice);
  return liquidity * (sqrtPc - sqrtPa);
}

export function calcAmountXY(liquidity: number, currentPrice: number, lowerPrice: number, upperPrice: number) {
  const x = calcAmountX(liquidity, currentPrice, upperPrice);
  const y = calcAmountY(liquidity, currentPrice, lowerPrice);
  return { x, y };
}