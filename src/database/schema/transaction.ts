import { integer, snakeCase, text } from 'drizzle-orm/pg-core'

export const transactionCodeCounter = snakeCase.table('transaction_code_counter', {
  prefix: text().primaryKey(),
  lastSequence: integer().notNull(),
})
