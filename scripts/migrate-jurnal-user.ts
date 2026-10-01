import process from 'node:process'
import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL wajib diisi')
}

const connection = postgres(process.env.DATABASE_URL, { max: 1 })

try {
  const migration = await Bun.file(new URL('../src/database/migrations/20261001_move_jurnal_user_to_detail.sql', import.meta.url)).text()
  await connection.begin(async (tx) => {
    await tx.unsafe(migration).simple()
  })
  console.log('Migrasi userId dari header jurnal ke detail selesai')
}
finally {
  await connection.end()
}
