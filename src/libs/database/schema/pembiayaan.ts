import { date, index, integer, snakeCase, text, timestamp } from 'drizzle-orm/pg-core'

import { akun } from './akun'
import { user } from './auth'
import { createdUpdated } from './common'
import { jurnal } from './jurnal'
import { approvedStatusEnum } from './simpanan'

export const pembiayaan = snakeCase.table(
  'pembiayaan',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    kodeTransaksi: text().notNull().unique(),
    userId: integer()
      .notNull()
      .references(() => user.id),
    jumlahPokok: integer().notNull(),
    persenMarginTahun: integer().notNull(),
    jumlahMargin: integer().notNull().default(0),
    biayaAkad: integer().notNull(),
    akunId: integer()
      .notNull()
      .references(() => akun.id),
    jurnalId: integer()
      .references(() => jurnal.id)
      .unique(),
    jangkaWaktuBulan: integer().notNull(),
    tujuan: text().notNull(),
    tanggalPembiayaan: date().notNull(),
    statusApproved: approvedStatusEnum().notNull().default('pending'),
    alasanPenolakan: text(),
    createdBy: integer()
      .notNull()
      .references(() => user.id),
    approvedBy: integer().references(() => user.id),
    approvedAt: timestamp({ withTimezone: true }),
    ...createdUpdated,
  },
  (table) => [
    index('pembiayaan_user_id_idx').on(table.userId),
    index('pembiayaan_akun_id_idx').on(table.akunId),
    index('pembiayaan_tanggal_pembiayaan_idx').on(table.tanggalPembiayaan),
  ],
)

export const angsuran = snakeCase.table(
  'angsuran',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    pembiayaanId: integer()
      .notNull()
      .references(() => pembiayaan.id),
    kodeTransaksi: text().notNull().unique(),
    tanggalTransaksi: date().notNull(),
    jumlahPembayaran: integer().notNull(),
    jumlahMargin: integer().notNull().default(0),
    akunId: integer()
      .notNull()
      .references(() => akun.id),
    statusApproved: approvedStatusEnum().notNull().default('pending'),
    alasanPenolakan: text(),
    jurnalId: integer()
      .references(() => jurnal.id)
      .unique(),
    keterangan: text(),
    createdBy: integer()
      .notNull()
      .references(() => user.id),
    approvedBy: integer().references(() => user.id),
    approvedAt: timestamp({ withTimezone: true }),
    ...createdUpdated,
  },
  (table) => [
    index('angsuran_pembiayaan_id_idx').on(table.pembiayaanId),
    index('angsuran_akun_id_idx').on(table.akunId),
    index('angsuran_tanggal_transaksi_idx').on(table.tanggalTransaksi),
  ],
)
