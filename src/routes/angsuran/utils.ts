import { and, eq, sql } from 'drizzle-orm'

import type { Transaction } from '#/libs/database'

import { angsuran } from '#/libs/database/schema/pembiayaan'

export async function getApprovedTotals(tx: Transaction, pembiayaanId: number) {
  const [totals] = await tx
    .select({
      totalPembayaran: sql<number>`coalesce(sum(${angsuran.jumlahPembayaran}), 0)`.mapWith(Number),
      totalMargin: sql<number>`coalesce(sum(${angsuran.jumlahMargin}), 0)`.mapWith(Number),
    })
    .from(angsuran)
    .where(and(eq(angsuran.pembiayaanId, pembiayaanId), eq(angsuran.statusApproved, 'approved')))

  return totals ?? { totalPembayaran: 0, totalMargin: 0 }
}

export function roundProportion(amount: number, numerator: number, denominator: number) {
  // Integer arithmetic keeps rupiah rounding exact even when the product exceeds Number.MAX_SAFE_INTEGER.
  const product = BigInt(amount) * BigInt(numerator)
  const divisor = BigInt(denominator)
  return Number((2n * product + divisor) / (2n * divisor))
}
