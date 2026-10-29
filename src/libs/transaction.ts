import { eq, sql } from 'drizzle-orm'

import type { Transaction } from '#/libs/database'

import { jurnal } from '#/libs/database/schema/jurnal'
import { mutasiSimpanan, pemindahbukuan } from '#/libs/database/schema/simpanan'
import { transactionCodeCounter } from '#/libs/database/schema/transaction'

type TransactionKind = 'simpanan' | 'jurnal' | 'pemindahbukuan'

const transactionSources = {
  simpanan: { prefix: 'STR', table: mutasiSimpanan },
  jurnal: { prefix: 'TRX', table: jurnal },
  pemindahbukuan: { prefix: 'PBK', table: pemindahbukuan },
} as const

function getMaxTransactionSequence(prefix: string, existingCodes: string[]) {
  return existingCodes.reduce((max, code) => {
    if (!code.startsWith(prefix)) {
      return max
    }

    const suffix = code.slice(prefix.length)
    const sequence = /^\d+$/.test(suffix) ? Number.parseInt(suffix, 10) : 0

    return sequence > max ? sequence : max
  }, 0)
}

async function getTransactionCodeCounter(
  tx: Transaction,
  kind: TransactionKind,
  date: string,
  retainedCodes: string[] = [],
) {
  const dateSegment = date.replaceAll('-', '')
  const prefix = `${transactionSources[kind].prefix}-${dateSegment}-`
  const lockKey = `${kind}-code:${dateSegment}`

  await tx.execute(sql`
    select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
  `)

  const [counter] = await tx.select().from(transactionCodeCounter).where(eq(transactionCodeCounter.prefix, prefix))

  if (counter) {
    const lastSequence = Math.max(counter.lastSequence, getMaxTransactionSequence(prefix, retainedCodes))

    if (lastSequence !== counter.lastSequence) {
      await tx.update(transactionCodeCounter).set({ lastSequence }).where(eq(transactionCodeCounter.prefix, prefix))
    }

    return { prefix, lastSequence }
  }

  // Initialize from existing records when upgrading a database without counters.
  const source = transactionSources[kind].table
  const existingCodes = await tx
    .select({ kodeTransaksi: source.kodeTransaksi })
    .from(source)
    .where(sql`left(${source.kodeTransaksi}, ${prefix.length}) = ${prefix}`)
  const lastSequence = getMaxTransactionSequence(prefix, [
    ...existingCodes.map((item) => item.kodeTransaksi),
    ...retainedCodes,
  ])

  await tx.insert(transactionCodeCounter).values({ prefix, lastSequence })

  return { prefix, lastSequence }
}

export async function allocateTransactionCode(tx: Transaction, kind: TransactionKind, date: string) {
  const { prefix, lastSequence } = await getTransactionCodeCounter(tx, kind, date)
  const nextSequence = lastSequence + 1

  await tx
    .update(transactionCodeCounter)
    .set({ lastSequence: nextSequence })
    .where(eq(transactionCodeCounter.prefix, prefix))

  return `${prefix}${String(nextSequence).padStart(3, '0')}`
}

export async function retainTransactionCodes(
  tx: Transaction,
  kind: TransactionKind,
  records: Array<{ kodeTransaksi: string; tanggalTransaksi: string }>,
) {
  const dates = [...new Set(records.map((record) => record.tanggalTransaksi))].toSorted()

  for (const date of dates) {
    await getTransactionCodeCounter(
      tx,
      kind,
      date,
      records.filter((record) => record.tanggalTransaksi === date).map((record) => record.kodeTransaksi),
    )
  }
}
