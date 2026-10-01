import { AmountOverflowError } from './errors'

const POSTGRES_INTEGER_MIN = -2_147_483_648n
const POSTGRES_INTEGER_MAX = 2_147_483_647n

export function assertInputInteger(value: number) {
  if (
    !Number.isSafeInteger(value)
    || BigInt(value) < 0n
    || BigInt(value) > POSTGRES_INTEGER_MAX
  ) {
    throw new AmountOverflowError()
  }

  return value
}

export function toPostgresInteger(
  value: number | bigint,
  message = 'Nilai transaksi melebihi batas yang diizinkan',
) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new AmountOverflowError(message)
  }

  const integer = BigInt(value)
  if (integer < POSTGRES_INTEGER_MIN || integer > POSTGRES_INTEGER_MAX) {
    throw new AmountOverflowError(message)
  }

  return Number(integer)
}
