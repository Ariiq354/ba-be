import { sql } from 'drizzle-orm'
import { check, date, index, integer, snakeCase, text } from 'drizzle-orm/pg-core'

import { akunKeuangan } from './akun'
import { user } from './auth'
import { createdUpdated } from './common'

export const pembiayaanEksternal = snakeCase.table(
  'pembiayaan_eksternal',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    kodeTransaksi: text().notNull().unique(),
    jumlahPokok: integer().notNull(),
    jumlahMargin: integer().notNull().default(0),
    akunId: integer()
      .notNull()
      .references(() => akunKeuangan.id),
    tanggalPembiayaan: date().notNull(),
    jangkaWaktuBulan: integer().notNull(),
    tujuan: text().notNull(),
    createdBy: integer()
      .notNull()
      .references(() => user.id),
    ...createdUpdated,
  },
  (table) => [
    check('pembiayaan_eksternal_pokok_check', sql`${table.jumlahPokok} > 0`),
    check('pembiayaan_eksternal_margin_check', sql`${table.jumlahMargin} >= 0`),
    check('pembiayaan_eksternal_tenor_check', sql`${table.jangkaWaktuBulan} > 0`),
    index('pembiayaan_eksternal_akun_id_idx').on(table.akunId),
    index('pembiayaan_eksternal_tanggal_pembiayaan_idx').on(table.tanggalPembiayaan),
  ],
)

export const angsuranEksternal = snakeCase.table(
  'angsuran_eksternal',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    pembiayaanEksternalId: integer()
      .notNull()
      .references(() => pembiayaanEksternal.id),
    kodeTransaksi: text().notNull().unique(),
    tanggalTransaksi: date().notNull(),
    jumlahPembayaran: integer().notNull(),
    jumlahMargin: integer().notNull().default(0),
    akunId: integer()
      .notNull()
      .references(() => akunKeuangan.id),
    keterangan: text(),
    createdBy: integer()
      .notNull()
      .references(() => user.id),
    ...createdUpdated,
  },
  (table) => [
    check('angsuran_eksternal_pembayaran_check', sql`${table.jumlahPembayaran} > 0`),
    check(
      'angsuran_eksternal_margin_check',
      sql`${table.jumlahMargin} >= 0 and ${table.jumlahMargin} <= ${table.jumlahPembayaran}`,
    ),
    index('angsuran_eksternal_pembiayaan_eksternal_id_idx').on(table.pembiayaanEksternalId),
    index('angsuran_eksternal_akun_id_idx').on(table.akunId),
    index('angsuran_eksternal_tanggal_transaksi_idx').on(table.tanggalTransaksi),
  ],
)
