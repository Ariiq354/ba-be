import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema } from '#/libs/errors'
import { idParamsSchema, paginationSchema, searchSchema } from '#/libs/schema'

export const OptionsGet = {
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer(),
          name: t.String(),
          noAnggota: t.Nullable(t.String()),
          idKelompok: t.Integer(),
          namaKelompok: t.String(),
        }),
      ),
    }),

    401: UnauthorizedSchema,
    404: ErrorSchema,
  },
} as const

export type OptionsGet = UnwrapModels<typeof OptionsGet>

export const ProfileGet = {
  Response: {
    200: t.Object({
      id: t.Integer(),
      name: t.String(),
      email: t.String(),
      image: t.String(),
      noAnggota: t.Nullable(t.String()),
      noHp: t.String(),
      nik: t.Nullable(t.String()),
      namaBank: t.Nullable(t.String()),
      noRekening: t.Nullable(t.String()),
      pemilikRekening: t.Nullable(t.String()),
      jalan: t.Nullable(t.String()),
      idProvinsi: t.Nullable(t.String()),
      idKabupatenKota: t.Nullable(t.String()),
      idKecamatan: t.Nullable(t.String()),
      idDesaKelurahan: t.Nullable(t.String()),
    }),

    401: UnauthorizedSchema,
    404: ErrorSchema,
  },
} as const

export type ProfileGet = UnwrapModels<typeof ProfileGet>

export const ProfilePatch = {
  Body: t.Object({
    name: t.Optional(t.String({ minLength: 1 })),
    imageAction: t.Optional(t.UnionEnum(['keep', 'update'])),
    image: t.Optional(t.String({ minLength: 1 })),
    noHp: t.String({ minLength: 1 }),
    nik: t.Optional(t.String({ minLength: 1 })),
    namaBank: t.Optional(t.String({ minLength: 1 })),
    noRekening: t.Optional(t.String({ minLength: 1 })),
    pemilikRekening: t.Optional(t.String({ minLength: 1 })),
    jalan: t.Optional(t.String({ minLength: 1 })),
    idProvinsi: t.Optional(
      t.String({
        minLength: 1,
        description: 'Jika berubah, kabupaten/kota, kecamatan, dan desa/kelurahan yang tidak dikirim akan dikosongkan.',
      }),
    ),
    idKabupatenKota: t.Optional(
      t.String({
        minLength: 1,
        description: 'Jika berubah, kecamatan dan desa/kelurahan yang tidak dikirim akan dikosongkan.',
      }),
    ),
    idKecamatan: t.Optional(
      t.String({
        minLength: 1,
        description: 'Jika berubah, desa/kelurahan yang tidak dikirim akan dikosongkan.',
      }),
    ),
    idDesaKelurahan: t.Optional(t.String({ minLength: 1 })),
  }),

  Response: {
    200: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    404: ErrorSchema,
    409: ErrorSchema,
  },
} as const

export type ProfilePatch = UnwrapModels<typeof ProfilePatch>

export const Get = {
  Query: t.Object({
    ...paginationSchema.properties,
    ...searchSchema.properties,
    status: t.UnionEnum(['all', 'pending', 'verified'], { default: 'all' }),
  }),

  Response: {
    200: t.Object({
      total: t.Integer(),
      data: t.Array(
        t.Object({
          id: t.Integer(),
          name: t.String(),
          image: t.String(),
          username: t.Nullable(t.String()),
          email: t.String(),
          noHp: t.String(),
          role: t.Nullable(t.String()),
          banned: t.Nullable(t.Boolean()),
          banReason: t.Nullable(t.String()),
          idKelompok: t.Integer(),
          namaKelompok: t.String(),
          kodeKelompok: t.String(),
          noAnggota: t.Nullable(t.String()),
          createdAt: t.Date(),
        }),
      ),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const ByIdVerifikasiPatch = {
  Params: idParamsSchema,
  Response: {
    200: t.Object({
      noAnggota: t.String(),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    409: ErrorSchema,
  },
} as const

export type ByIdVerifikasiPatch = UnwrapModels<typeof ByIdVerifikasiPatch>
