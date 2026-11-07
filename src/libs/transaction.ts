import { like, sql } from 'drizzle-orm'

import type { Transaction } from '#/libs/database'

import { jurnal } from '#/libs/database/schema/jurnal'
import { angsuran, pembiayaan } from '#/libs/database/schema/pembiayaan'
import { pemindahbukuan, simpananRiwayat } from '#/libs/database/schema/simpanan'

type TransactionKind = 'simpanan' | 'jurnal' | 'pemindahbukuan' | 'pembiayaan' | 'angsuran' | 'shu'

const transactionSources = {
  simpanan: { prefix: 'STR', table: simpananRiwayat },
  jurnal: { prefix: 'TRX', table: jurnal },
  pemindahbukuan: { prefix: 'PBK', table: pemindahbukuan },
  pembiayaan: { prefix: 'PEMB', table: pembiayaan },
  angsuran: { prefix: 'AGS', table: angsuran },
  shu: { prefix: 'SHU', table: jurnal },
} as const

export async function allocateTransactionCode(tx: Transaction, kind: TransactionKind, date: string) {
  const source = transactionSources[kind]
  const dateSegment = date.replaceAll('-', '')
  const prefix = `${source.prefix}-${dateSegment}-`
  const lockKey = `${kind}-code:${dateSegment}`

  await tx.execute(sql`
    select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
  `)

  const [last] = await tx
    .select({
      sequence: sql<number>`coalesce(max(split_part(${source.table.kodeTransaksi}, '-', 3)::integer), 0)`.mapWith(
        Number,
      ),
    })
    .from(source.table)
    .where(like(source.table.kodeTransaksi, `${prefix}%`))

  return `${prefix}${String(last!.sequence + 1).padStart(3, '0')}`
}
