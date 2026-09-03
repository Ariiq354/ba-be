import { asc } from 'drizzle-orm'
import { Effect } from 'effect'
import { db } from '#/database'
import { kelompok } from '#/database/schema/kelompok'
import { DatabaseError } from '#/utils/errors'

export const KelompokService = {
  getKelompokOptions: Effect.fn('KelompokService.getKelompokOptions')(() => {
    return Effect.tryPromise({
      try: async () => {
        const data = await db
          .select({
            id: kelompok.id,
            kodeKelompok: kelompok.kodeKelompok,
            namaKelompok: kelompok.namaKelompok,
          })
          .from(kelompok)
          .orderBy(asc(kelompok.namaKelompok), asc(kelompok.kodeKelompok))

        return { data }
      },
      catch: error => new DatabaseError({ error }),
    })
  }),
}
