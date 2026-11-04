import { sql } from 'drizzle-orm'
import { check, integer, snakeCase, unique } from 'drizzle-orm/pg-core'

import { user } from './auth'

export const shu = snakeCase.table('shu', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  idUser: integer()
    .notNull()
    .references(() => user.id),
  jumlahShuSaham: integer().notNull().default(0),
  jumlahShuTabungan: integer().notNull().default(0),
  tahun: integer().notNull(),
})
