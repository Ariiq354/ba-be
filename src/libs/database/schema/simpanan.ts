import { sql } from 'drizzle-orm'
import { check, date, index, integer, numeric, pgEnum, snakeCase, text, timestamp } from 'drizzle-orm/pg-core'

import { akunKeuangan } from './akun'
import { user } from './auth'
import { createdUpdated } from './common'

export const jenisTransaksiEnum = pgEnum('jenis_transaksi', ['setoran', 'penarikan'])
export const approvedStatusEnum = pgEnum('approved_status', ['pending', 'approved', 'rejected'])
export const jenisPemindahbukuanEnum = pgEnum('jenis_pemindahbukuan', [
  'saham_ke_saham',
  'tabungan_ke_tabungan',
  'tabungan_ke_saham',
  'pembelian_kembali_saham',
])
export const jenisSimpananEnum = pgEnum('jenis_simpanan', ['tabungan', 'saham'])

export const simpananSaldo = snakeCase.table('simpanan_saldo', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: integer()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(),
  saldoTabungan: integer().notNull().default(0),
  jumlahSaham: numeric({ precision: 11, scale: 1, mode: 'number' }).notNull().default(0),
  ...createdUpdated,
})

export const simpananRiwayat = snakeCase.table(
  'simpanan_riwayat',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    kodeTransaksi: text().notNull().unique(),
    userId: integer()
      .notNull()
      .references(() => user.id),
    akunId: integer()
      .notNull()
      .references(() => akunKeuangan.id),
    jenisTransaksi: jenisTransaksiEnum().notNull(),
    jenisSimpanan: jenisSimpananEnum().notNull(),
    nilaiTransaksi: integer().notNull(),
    jumlahSaham: numeric({ precision: 11, scale: 1, mode: 'number' }).notNull().default(0),
    hargaPerSaham: integer().notNull().default(0),
    hargaNominalPerSaham: integer().notNull().default(0),
    agioSaham: integer().notNull().default(0),
    saldoSetelahTransaksi: integer(),
    jumlahSahamSetelahTransaksi: numeric({ precision: 11, scale: 1, mode: 'number' }),
    tanggalTransaksi: date().notNull(),
    statusApproved: approvedStatusEnum().notNull().default('pending'),
    alasanPenolakan: text(),
    keterangan: text(),
    createdBy: integer()
      .notNull()
      .references(() => user.id),
    approvedBy: integer().references(() => user.id),
    approvedAt: timestamp({ withTimezone: true }),
    ...createdUpdated,
  },
  (table) => [
    index('simpanan_riwayat_user_id_idx').on(table.userId),
    index('simpanan_riwayat_akun_id_idx').on(table.akunId),
    index('simpanan_riwayat_tanggal_transaksi_idx').on(table.tanggalTransaksi),
  ],
)

export const pemindahbukuan = snakeCase.table(
  'pemindahbukuan',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    kodeTransaksi: text().notNull().unique(),
    idUserSumber: integer()
      .notNull()
      .references(() => user.id),
    akunIdSumber: integer()
      .notNull()
      .references(() => akunKeuangan.id),
    idUserTujuan: integer().references(() => user.id),
    akunIdTujuan: integer()
      .notNull()
      .references(() => akunKeuangan.id),
    nominal: integer().notNull(),
    jumlahSaham: numeric({ precision: 11, scale: 1, mode: 'number' }).notNull().default(0),
    hargaPerSaham: integer().notNull().default(0),
    hargaNominalPerSaham: integer().notNull().default(0),
    agioSaham: integer().notNull().default(0),
    tipePemindahbukuan: jenisPemindahbukuanEnum().notNull(),
    tanggalTransaksi: date().notNull(),
    statusApproved: approvedStatusEnum().notNull().default('pending'),
    alasanPenolakan: text(),
    keterangan: text(),
    createdBy: integer()
      .notNull()
      .references(() => user.id),
    approvedBy: integer().references(() => user.id),
    approvedAt: timestamp({ withTimezone: true }),
    ...createdUpdated,
  },
  (table) => [
    check(
      'pemindahbukuan_tujuan_check',
      sql`(${table.tipePemindahbukuan} = 'pembelian_kembali_saham') = (${table.idUserTujuan} is null)`,
    ),
    index('pemindahbukuan_user_sumber_idx').on(table.idUserSumber),
    index('pemindahbukuan_user_tujuan_idx').on(table.idUserTujuan),
    index('pemindahbukuan_tanggal_transaksi_idx').on(table.tanggalTransaksi),
  ],
)
