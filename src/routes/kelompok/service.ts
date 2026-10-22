import { asc } from 'drizzle-orm'

import { db } from '#/libs/database'
import { kelompok } from '#/libs/database/schema/kelompok'

import type * as KelompokModel from './model'

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

    return { data } satisfies KelompokModel.OptionsGet['Response'][200]
  },
}
