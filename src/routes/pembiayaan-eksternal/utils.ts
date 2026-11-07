import { eq, getTableColumns, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import type { Transaction } from '#/libs/database'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { akunKeuangan } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { angsuranEksternal, pembiayaanEksternal } from '#/libs/database/schema/pembiayaan-eksternal'
import { getJakartaDate } from '#/libs/date'

import { InvalidExternalAccountError, InvalidPembiayaanEksternalError } from './errors'

const creator = alias(user, 'external_creator')
const pembayaran = db
  .select({
    pembiayaanId: angsuranEksternal.pembiayaanEksternalId,
    totalPembayaran: sql<number>`sum(${angsuranEksternal.jumlahPembayaran})`.mapWith(Number).as('total_pembayaran'),
    totalMargin: sql<number>`sum(${angsuranEksternal.jumlahMargin})`.mapWith(Number).as('total_margin'),
  })
  .from(angsuranEksternal)
  .groupBy(angsuranEksternal.pembiayaanEksternalId)
  .as('pembayaran_eksternal')

export const sisaPembiayaanExpression = sql`${pembiayaanEksternal.jumlahPokok}::bigint + ${pembiayaanEksternal.jumlahMargin} - coalesce(${pembayaran.totalPembayaran}, 0)`

export function getPembiayaanQuery() {
  return db
    .select({
      ...getTableColumns(pembiayaanEksternal),
      namaAkun: akunKeuangan.namaAkun,
      creatorName: creator.name,
      totalPembayaran: sql<number>`coalesce(${pembayaran.totalPembayaran}, 0)`.mapWith(Number),
      totalMarginDibayar: sql<number>`coalesce(${pembayaran.totalMargin}, 0)`.mapWith(Number),
      tanggalAkhirAngsuran: sql<string>`(${pembiayaanEksternal.tanggalPembiayaan} + make_interval(months => ${pembiayaanEksternal.jangkaWaktuBulan}))::date::text`,
    })
    .from(pembiayaanEksternal)
    .innerJoin(akunKeuangan, eq(akunKeuangan.id, pembiayaanEksternal.akunId))
    .innerJoin(creator, eq(creator.id, pembiayaanEksternal.createdBy))
    .leftJoin(pembayaran, eq(pembayaran.pembiayaanId, pembiayaanEksternal.id))
}

export function serializePembiayaan(row: Awaited<ReturnType<typeof getPembiayaanQuery>>[number]) {
  const { updatedAt: _updatedAt, ...data } = row
  const totalPembiayaan = row.jumlahPokok + row.jumlahMargin
  const sisaPokok = row.jumlahPokok - (row.totalPembayaran - row.totalMarginDibayar)
  const sisaMargin = row.jumlahMargin - row.totalMarginDibayar
  const sisaPembiayaan = sisaPokok + sisaMargin
  return {
    ...data,
    totalPembiayaan,
    sisaPokok,
    sisaMargin,
    sisaPembiayaan,
    statusPelunasan: sisaPembiayaan === 0 ? ('lunas' as const) : ('belum_lunas' as const),
    createdAt: row.createdAt.toISOString(),
  }
}

export function getTransactionDate(value?: string) {
  const today = getJakartaDate()
  const date = value ?? today
  const parsed = new Date(`${date}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date.startsWith('0000') ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date ||
    date > today
  ) {
    throw new InvalidPembiayaanEksternalError('Tanggal transaksi harus valid dan tidak boleh di masa depan')
  }
  return date
}

export async function assertExternalAccounts(tx: Transaction, akunId: number, jumlahMargin: number) {
  const required = [
    { id: akunId, kategori: 'aktiva', normalBalance: 'debit' },
    { id: AkunId.HUTANGPEMBIAYAAN, kategori: 'pasiva', normalBalance: 'kredit' },
    ...(jumlahMargin > 0
      ? [
          { id: AkunId.HUTANGMARGINPEMBIAYAAN, kategori: 'pasiva', normalBalance: 'kredit' },
          { id: AkunId.BIAYAMARGINPEMBIAYAAN, kategori: 'biaya', normalBalance: 'debit' },
        ]
      : []),
  ]
  const accounts = await tx
    .select()
    .from(akunKeuangan)
    .where(
      inArray(
        akunKeuangan.id,
        required.map((account) => account.id),
      ),
    )
  for (const requirement of required) {
    const account = accounts.find((candidate) => candidate.id === requirement.id)
    if (
      !account?.isActive ||
      account.kategori !== requirement.kategori ||
      account.normalBalance !== requirement.normalBalance
    ) {
      throw new InvalidExternalAccountError({ akunId: requirement.id })
    }
  }
}

export async function recordExternalJournal(
  tx: Transaction,
  adminId: number,
  data: { kodeTransaksi: string; tanggalTransaksi: string; keterangan: string | null },
  details: Array<{ akunId: number; debit: number; kredit: number }>,
) {
  const [created] = await tx.insert(jurnal).values(data).returning({ id: jurnal.id })
  if (!created) {
    throw new Error('Jurnal pembiayaan eksternal gagal dibuat')
  }
  await tx.insert(jurnalDetail).values(
    details.map((detail) => ({
      ...detail,
      jurnalId: created.id,
      userId: adminId,
    })),
  )
}
