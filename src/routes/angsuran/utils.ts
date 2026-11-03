export function roundProportion(amount: number, numerator: number, denominator: number) {
  // Integer arithmetic keeps rupiah rounding exact even when the product exceeds Number.MAX_SAFE_INTEGER.
  const product = BigInt(amount) * BigInt(numerator)
  const divisor = BigInt(denominator)
  return Number((2n * product + divisor) / (2n * divisor))
}
