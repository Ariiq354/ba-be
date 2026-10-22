import { defineConfig } from 'drizzle-kit'
import process from 'node:process'

export default defineConfig({
  schema: './src/libs/database/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
})
