import process from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import { relations } from './relations'

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL,
  },
  relations,
})
