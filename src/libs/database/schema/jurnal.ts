import { date, index, integer, snakeCase, text, timestamp } from 'drizzle-orm/pg-core'

import { akunKeuangan } from './akun'
import { user } from './auth'

export const jurnal = snakeCase.table(
  'jurnal',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    kodeTransaksi: text().notNull(),
    tanggalTransaksi: date().notNull(),
    keterangan: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('jurnal_tanggal_transaksi_idx').on(table.tanggalTransaksi),
    index('jurnal_kode_transaksi_idx').on(table.kodeTransaksi),
  ],
)

export const jurnalDetail = snakeCase.table(
  'jurnal_detail',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    jurnalId: integer()
      .notNull()
      .references(() => jurnal.id, {
        onDelete: 'cascade',
      }),
    akunId: integer()
      .notNull()
      .references(() => akunKeuangan.id),
    userId: integer()
      .notNull()
      .references(() => user.id),
    debit: integer().notNull().default(0),
    kredit: integer().notNull().default(0),
  },
  (table) => [
    index('jurnal_detail_jurnal_id_idx').on(table.jurnalId),
    index('jurnal_detail_akun_id_idx').on(table.akunId),
    index('jurnal_detail_user_id_idx').on(table.userId),
  ],
)
