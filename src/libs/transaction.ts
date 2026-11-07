import { like, sql } from 'drizzle-orm'

import type { Transaction } from '#/libs/database'

import { jurnal } from '#/libs/database/schema/jurnal'
import { angsuran, pembiayaan } from '#/libs/database/schema/pembiayaan'
import { angsuranEksternal, pembiayaanEksternal } from '#/libs/database/schema/pembiayaan-eksternal'
import { pemindahbukuan, simpananRiwayat } from '#/libs/database/schema/simpanan'

type TransactionKind = keyof typeof transactionSources

const transactionSources = {
  simpanan: { prefix: 'STR', table: simpananRiwayat },
  jurnal: { prefix: 'TRX', table: jurnal },
  pemindahbukuan: { prefix: 'PBK', table: pemindahbukuan },
  pembiayaan: { prefix: 'PEMB', table: pembiayaan },
  angsuran: { prefix: 'AGS', table: angsuran },
  pembiayaanEksternal: { prefix: 'PEMB', table: pembiayaanEksternal },
  angsuranEksternal: { prefix: 'AGS', table: angsuranEksternal },
  shu: { prefix: 'SHU', table: jurnal },
} as const

export async function allocateTransactionCode(tx: Transaction, kind: TransactionKind, date: string) {
  const source = transactionSources[kind]
  const dateSegment = date.replaceAll('-', '')
  const prefix = `${source.prefix}-${dateSegment}-`
  const lockKey = `${source.prefix}-code:${dateSegment}`

  await tx.execute(sql`
    select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
  `)

  // Internal and external transactions share both the daily sequence and its lock.
  let sequence = 0
  for (const { table } of Object.values(transactionSources).filter((candidate) => candidate.prefix === source.prefix)) {
    const [last] = await tx
      .select({
        sequence: sql<number>`coalesce(max(split_part(${table.kodeTransaksi}, '-', 3)::integer), 0)`.mapWith(Number),
      })
      .from(table)
      .where(like(table.kodeTransaksi, `${prefix}%`))
    sequence = Math.max(sequence, last?.sequence ?? 0)
  }

  return `${prefix}${String(sequence + 1).padStart(3, '0')}`
}
