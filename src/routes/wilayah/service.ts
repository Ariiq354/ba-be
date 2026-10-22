import { asc, eq } from 'drizzle-orm'

import { db } from '#/libs/database'
import { kelurahan as desaKelurahan, kota as kabupatenKota, kecamatan, provinsi } from '#/libs/database/schema/wilayah'

import type * as WilayahModel from './model'

export const WilayahService = {
  async getProvinsi() {
    const data = await db
      .select({
        id: provinsi.id,
        provinsi: provinsi.provinsi,
      })
      .from(provinsi)
      .orderBy(asc(provinsi.provinsi))

    return { data } satisfies WilayahModel.ProvinsiGet['Response'][200]
  },

  async getKabupatenKota(query: WilayahModel.KabupatenKotaGet['Query']) {
    const data = await db
      .select({
        id: kabupatenKota.id,
        idProvinsi: kabupatenKota.idProvinsi,
        kabupatenKota: kabupatenKota.kota,
      })
      .from(kabupatenKota)
      .where(eq(kabupatenKota.idProvinsi, query.idProvinsi))
      .orderBy(asc(kabupatenKota.kota))

    return { data } satisfies WilayahModel.KabupatenKotaGet['Response'][200]
  },

  async getKecamatan(query: WilayahModel.KecamatanGet['Query']) {
    const data = await db
      .select({
        id: kecamatan.id,
        idKabupatenKota: kecamatan.idKota,
        kecamatan: kecamatan.kecamatan,
      })
      .from(kecamatan)
      .where(eq(kecamatan.idKota, query.idKabupatenKota))
      .orderBy(asc(kecamatan.kecamatan))

    return { data } satisfies WilayahModel.KecamatanGet['Response'][200]
  },

  async getDesaKelurahan(query: WilayahModel.DesaKelurahanGet['Query']) {
    const data = await db
      .select({
        id: desaKelurahan.id,
        idKecamatan: desaKelurahan.idKecamatan,
        desaKelurahan: desaKelurahan.kelurahan,
      })
      .from(desaKelurahan)
      .where(eq(desaKelurahan.idKecamatan, query.idKecamatan))
      .orderBy(asc(desaKelurahan.kelurahan))

    return { data } satisfies WilayahModel.DesaKelurahanGet['Response'][200]
  },
}
