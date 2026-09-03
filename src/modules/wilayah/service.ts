import type { WilayahModel } from './model'
import { asc, eq } from 'drizzle-orm'
import { Effect } from 'effect'
import { db } from '#/database'
import {
  kelurahan as desaKelurahan,
  kota as kabupatenKota,
  kecamatan,
  provinsi,
} from '#/database/schema/wilayah'
import { DatabaseError } from '#/utils/errors'

export const WilayahService = {
  getProvinsi: Effect.fn('WilayahService.getProvinsi')(function* () {
    return yield* Effect.tryPromise({
      try: async () => {
        const data = await db
          .select({
            id: provinsi.id,
            provinsi: provinsi.provinsi,
          })
          .from(provinsi)
          .orderBy(asc(provinsi.provinsi))

        return { data }
      },
      catch: error => new DatabaseError({ error }),
    })
  }),

  getKabupatenKota: Effect.fn('WilayahService.getKabupatenKota')(function* (
    query: WilayahModel['getKabupatenKotaQuerySchema'],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        const data = await db
          .select({
            id: kabupatenKota.id,
            idProvinsi: kabupatenKota.idProvinsi,
            kabupatenKota: kabupatenKota.kota,
          })
          .from(kabupatenKota)
          .where(eq(kabupatenKota.idProvinsi, query.idProvinsi))
          .orderBy(asc(kabupatenKota.kota))

        return { data }
      },
      catch: error => new DatabaseError({ error }),
    })
  }),

  getKecamatan: Effect.fn('WilayahService.getKecamatan')(function* (
    query: WilayahModel['getKecamatanQuerySchema'],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        const data = await db
          .select({
            id: kecamatan.id,
            idKabupatenKota: kecamatan.idKota,
            kecamatan: kecamatan.kecamatan,
          })
          .from(kecamatan)
          .where(eq(kecamatan.idKota, query.idKabupatenKota))
          .orderBy(asc(kecamatan.kecamatan))

        return { data }
      },
      catch: error => new DatabaseError({ error }),
    })
  }),

  getDesaKelurahan: Effect.fn('WilayahService.getDesaKelurahan')(function* (
    query: WilayahModel['getDesaKelurahanQuerySchema'],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        const data = await db
          .select({
            id: desaKelurahan.id,
            idKecamatan: desaKelurahan.idKecamatan,
            desaKelurahan: desaKelurahan.kelurahan,
          })
          .from(desaKelurahan)
          .where(eq(desaKelurahan.idKecamatan, query.idKecamatan))
          .orderBy(asc(desaKelurahan.kelurahan))

        return { data }
      },
      catch: error => new DatabaseError({ error }),
    })
  }),
}
