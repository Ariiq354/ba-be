import Elysia from 'elysia'

import * as WilayahModel from './model'
import { WilayahService } from './service'

export const WilayahRoutes = new Elysia({ prefix: 'wilayah', tags: ['Wilayah'] })
  .get(
    '/provinsi',
    {
      response: WilayahModel.ProvinsiGet.Response,
    },
    () => WilayahService.getProvinsi(),
  )
  .get(
    '/kabupaten-kota',
    {
      query: WilayahModel.KabupatenKotaGet.Query,
      response: WilayahModel.KabupatenKotaGet.Response,
    },
    ({ query }) => WilayahService.getKabupatenKota(query),
  )
  .get(
    '/kecamatan',
    {
      query: WilayahModel.KecamatanGet.Query,
      response: WilayahModel.KecamatanGet.Response,
    },
    ({ query }) => WilayahService.getKecamatan(query),
  )
  .get(
    '/desa-kelurahan',
    {
      query: WilayahModel.DesaKelurahanGet.Query,
      response: WilayahModel.DesaKelurahanGet.Response,
    },
    ({ query }) => WilayahService.getDesaKelurahan(query),
  )
