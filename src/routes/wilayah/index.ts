import Elysia from 'elysia'

import { wilayahModel } from './model'
import { WilayahService } from './service'

export const WilayahRoutes = new Elysia({ prefix: 'wilayah', tags: ['Wilayah'] })
  .get(
    '/provinsi',
    {
      response: {
        200: wilayahModel.getProvinsiResponseSchema,
      },
    },
    () => WilayahService.getProvinsi(),
  )
  .get(
    '/kabupaten-kota',
    {
      query: wilayahModel.getKabupatenKotaQuerySchema,
      response: {
        200: wilayahModel.getKabupatenKotaResponseSchema,
      },
    },
    ({ query }) => WilayahService.getKabupatenKota(query),
  )
  .get(
    '/kecamatan',
    {
      query: wilayahModel.getKecamatanQuerySchema,
      response: {
        200: wilayahModel.getKecamatanResponseSchema,
      },
    },
    ({ query }) => WilayahService.getKecamatan(query),
  )
  .get(
    '/desa-kelurahan',
    {
      query: wilayahModel.getDesaKelurahanQuerySchema,
      response: {
        200: wilayahModel.getDesaKelurahanResponseSchema,
      },
    },
    ({ query }) => WilayahService.getDesaKelurahan(query),
  )
