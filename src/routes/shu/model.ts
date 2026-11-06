import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/libs/errors'

const tahunSchema = t.Integer({ minimum: 1, maximum: 9999 })

export const Get = {
  Query: t.Object({
    tahun: tahunSchema,
    userId: t.Optional(
      t.Integer({
        minimum: 1,
        description: 'Default pengguna login. Hanya admin yang dapat memilih pengguna lain.',
      }),
    ),
  }),
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer(),
          tahun: tahunSchema,
          idUser: t.Integer(),
          nama: t.String(),
          noAnggota: t.Nullable(t.String()),
          jumlahShuSaham: t.Integer(),
          jumlahShuTabungan: t.Integer(),
          totalShu: t.Integer(),
          dialihkanAt: t.Nullable(t.String({ format: 'date-time' })),
        }),
      ),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const MonitoringGet = {
  Query: t.Object({
    tahun: tahunSchema,
    idKelompok: t.Optional(t.Integer({ minimum: 1 })),
  }),
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Nullable(t.Integer()),
          tahun: tahunSchema,
          idUser: t.Integer(),
          nama: t.String(),
          noAnggota: t.Nullable(t.String()),
          idKelompok: t.Integer(),
          namaKelompok: t.String(),
          jumlahShuSaham: t.Integer(),
          jumlahShuTabungan: t.Integer(),
          totalShu: t.Integer(),
          dialihkanAt: t.Nullable(t.String({ format: 'date-time' })),
        }),
      ),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    422: ValidationErrorSchema,
  },
} as const

export type MonitoringGet = UnwrapModels<typeof MonitoringGet>

export const ReferensiGet = {
  Query: t.Object({ tahun: tahunSchema }),
  Response: {
    200: t.Object({
      tahun: tahunSchema,
      laba: t.Integer(),
      batasShu: t.Integer(),
      sudahDibagikan: t.Boolean(),
      sudahDialihkan: t.Boolean(),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type ReferensiGet = UnwrapModels<typeof ReferensiGet>

export const Post = {
  Body: t.Object({
    tahun: tahunSchema,
    totalShu: t.Integer({ minimum: 1 }),
  }),
  Response: {
    201: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    409: ErrorSchema,
  },
} as const

export type Post = UnwrapModels<typeof Post>

export const PengalihanPost = {
  Body: t.Object({ tahun: tahunSchema }),
  Response: {
    200: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    409: ErrorSchema,
  },
} as const

export type PengalihanPost = UnwrapModels<typeof PengalihanPost>
