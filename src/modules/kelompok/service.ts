import { asc } from 'drizzle-orm'
import { db } from '#/database'
import { kelompok } from '#/database/schema/kelompok'

export const KelompokService = {
  async getKelompokOptions() {
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
}
