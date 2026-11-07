import { boolean, index, integer, pgEnum, snakeCase, text, timestamp } from 'drizzle-orm/pg-core'

import { akunKeuangan } from './akun'
import { user } from './auth'
import { createdUpdated } from './common'

export const jaminanEnum = pgEnum('jaminan', ['TIDAK_ADA', 'ADA'])

export const saham = snakeCase.table('saham', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  hargaNominal: integer().notNull(),
  hargaJual: integer().notNull(),
  updatedBy: integer()
    .notNull()
    .references(() => user.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const margin = snakeCase.table('margin', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  minNominal: integer().notNull(),
  maxNominal: integer(),
  persenMarginTahun: integer().notNull(),
  jaminan: jaminanEnum().notNull(),
  biayaAkad: integer().notNull(),
  ...createdUpdated,
})

export const templateTransaksi = snakeCase.table(
  'template_transaksi',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    nama: text().notNull(),
    akunDebitId: integer()
      .notNull()
      .references(() => akunKeuangan.id, { onDelete: 'restrict' }),
    akunKreditId: integer()
      .notNull()
      .references(() => akunKeuangan.id, { onDelete: 'restrict' }),
    isActive: boolean().notNull().default(true),
    ...createdUpdated,
  },
  (table) => [
    index('template_transaksi_akun_debit_id_idx').on(table.akunDebitId),
    index('template_transaksi_akun_kredit_id_idx').on(table.akunKreditId),
  ],
)
