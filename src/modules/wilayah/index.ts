import Elysia from 'elysia'
import { ErrorSchema } from '#/utils/errors'
import { wilayahModel } from './model'
import { WilayahService } from './service'

export const WilayahModules = new Elysia({ prefix: 'wilayah', tags: ['Wilayah'] })
  .get(
    '/provinsi',
    () => WilayahService.getProvinsi(),
    {
      response: {
        200: wilayahModel.getProvinsiResponseSchema,
        500: ErrorSchema,
      },
    },
  )
  .get(
    '/kabupaten-kota',
    ({ query }) => WilayahService.getKabupatenKota(query),
    {
      query: wilayahModel.getKabupatenKotaQuerySchema,
      response: {
        200: wilayahModel.getKabupatenKotaResponseSchema,
        500: ErrorSchema,
      },
    },
  )
  .get(
    '/kecamatan',
    ({ query }) => WilayahService.getKecamatan(query),
    {
      query: wilayahModel.getKecamatanQuerySchema,
      response: {
        200: wilayahModel.getKecamatanResponseSchema,
        500: ErrorSchema,
      },
    },
  )
  .get(
    '/desa-kelurahan',
    ({ query }) => WilayahService.getDesaKelurahan(query),
    {
      query: wilayahModel.getDesaKelurahanQuerySchema,
      response: {
        200: wilayahModel.getDesaKelurahanResponseSchema,
        500: ErrorSchema,
      },
    },
  )
