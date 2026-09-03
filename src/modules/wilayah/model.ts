import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'

const wilayahIdSchema = t.String({ minLength: 1, pattern: '\\S' })

export const wilayahModel = {
  getProvinsiResponseSchema: t.Object({
    data: t.Array(
      t.Object({
        id: t.String(),
        provinsi: t.String(),
      }),
    ),
  }),

  getKabupatenKotaQuerySchema: t.Object({
    idProvinsi: wilayahIdSchema,
  }),

  getKabupatenKotaResponseSchema: t.Object({
    data: t.Array(
      t.Object({
        id: t.String(),
        idProvinsi: t.String(),
        kabupatenKota: t.String(),
      }),
    ),
  }),

  getKecamatanQuerySchema: t.Object({
    idKabupatenKota: wilayahIdSchema,
  }),

  getKecamatanResponseSchema: t.Object({
    data: t.Array(
      t.Object({
        id: t.String(),
        idKabupatenKota: t.String(),
        kecamatan: t.String(),
      }),
    ),
  }),

  getDesaKelurahanQuerySchema: t.Object({
    idKecamatan: wilayahIdSchema,
  }),

  getDesaKelurahanResponseSchema: t.Object({
    data: t.Array(
      t.Object({
        id: t.String(),
        idKecamatan: t.String(),
        desaKelurahan: t.String(),
      }),
    ),
  }),
} as const

export type WilayahModel = {
  [key in keyof typeof wilayahModel]: UnwrapSchema<(typeof wilayahModel)[key]>;
}
