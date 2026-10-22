import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

const wilayahIdSchema = t.String({ minLength: 1, pattern: '\\S' })

export const ProvinsiGet = {
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.String(),
          provinsi: t.String(),
        }),
      ),
    }),
  },
} as const

export type ProvinsiGet = UnwrapModels<typeof ProvinsiGet>

export const KabupatenKotaGet = {
  Query: t.Object({
    idProvinsi: wilayahIdSchema,
  }),
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.String(),
          idProvinsi: t.String(),
          kabupatenKota: t.String(),
        }),
      ),
    }),
  },
} as const

export type KabupatenKotaGet = UnwrapModels<typeof KabupatenKotaGet>

export const KecamatanGet = {
  Query: t.Object({
    idKabupatenKota: wilayahIdSchema,
  }),
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.String(),
          idKabupatenKota: t.String(),
          kecamatan: t.String(),
        }),
      ),
    }),
  },
} as const

export type KecamatanGet = UnwrapModels<typeof KecamatanGet>

export const DesaKelurahanGet = {
  Query: t.Object({
    idKecamatan: wilayahIdSchema,
  }),
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.String(),
          idKecamatan: t.String(),
          desaKelurahan: t.String(),
        }),
      ),
    }),
  },
} as const

export type DesaKelurahanGet = UnwrapModels<typeof DesaKelurahanGet>
