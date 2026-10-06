import { integer, snakeCase, text, timestamp } from 'drizzle-orm/pg-core'

export const kelompok = snakeCase.table('kelompok', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  kodeKelompok: text().notNull().unique(),
  namaKelompok: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})
