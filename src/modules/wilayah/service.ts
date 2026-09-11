import type { WilayahModel } from './model'
import { asc, eq } from 'drizzle-orm'
import { db } from '#/database'
import {
  kelurahan as desaKelurahan,
  kota as kabupatenKota,
  kecamatan,
  provinsi,
} from '#/database/schema/wilayah'

export const WilayahService = {
  async getProvinsi() {
    const data = await db
      .select({
        id: provinsi.id,
        provinsi: provinsi.provinsi,
      })
      .from(provinsi)
      .orderBy(asc(provinsi.provinsi))

    return { data }
  },

  async getKabupatenKota(
    query: WilayahModel['getKabupatenKotaQuerySchema'],
  ) {
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

  async getKecamatan(
    query: WilayahModel['getKecamatanQuerySchema'],
  ) {
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

  async getDesaKelurahan(
    query: WilayahModel['getDesaKelurahanQuerySchema'],
  ) {
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
}
