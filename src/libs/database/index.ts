import { drizzle } from 'drizzle-orm/postgres-js'
import process from 'node:process'

import { relations } from './relations'

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL,
  },
  relations,
})

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
