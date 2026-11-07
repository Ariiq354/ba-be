import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/libs/errors'
import { searchSchema } from '#/libs/schema'

const pembiayaanResponseSchema = t.Object({
  id: t.Integer(),
  kodeTransaksi: t.String(),
  jumlahPokok: t.Integer(),
  jumlahMargin: t.Integer(),
  totalPembiayaan: t.Integer(),
  akunId: t.Integer(),
  namaAkun: t.String(),
  tanggalPembiayaan: t.String({ format: 'date' }),
  tanggalAkhirAngsuran: t.String({ format: 'date' }),
  jangkaWaktuBulan: t.Integer(),
  tujuan: t.String(),
  totalPembayaran: t.Integer(),
  totalMarginDibayar: t.Integer(),
  sisaPokok: t.Integer(),
  sisaMargin: t.Integer(),
  sisaPembiayaan: t.Integer(),
  statusPelunasan: t.UnionEnum(['belum_lunas', 'lunas']),
  createdBy: t.Integer(),
  creatorName: t.String(),
  createdAt: t.String({ format: 'date-time' }),
})

const errorResponses = {
  400: ErrorSchema,
  401: UnauthorizedSchema,
  403: ForbiddenSchema,
  404: ErrorSchema,
  409: ErrorSchema,
  422: ValidationErrorSchema,
} as const

export const Get = {
  Query: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    ...searchSchema.properties,
    statusPelunasan: t.UnionEnum(['all', 'belum_lunas', 'lunas'], { default: 'all' }),
  }),
  Response: {
    200: t.Object({ total: t.Integer(), data: t.Array(pembiayaanResponseSchema) }),
    ...errorResponses,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const OptionsGet = {
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer(),
          kodeTransaksi: t.String(),
          tujuan: t.String(),
          sisaPokok: t.Integer(),
          sisaMargin: t.Integer(),
          sisaPembiayaan: t.Integer(),
        }),
      ),
    }),
    ...errorResponses,
  },
} as const

export type OptionsGet = UnwrapModels<typeof OptionsGet>

export const Post = {
  Body: t.Object({
    jumlahPokok: t.Integer({ minimum: 1 }),
    jumlahMargin: t.Integer({ minimum: 0, default: 0 }),
    tanggalPembiayaan: t.Optional(t.String({ format: 'date' })),
    jangkaWaktuBulan: t.Integer({ minimum: 1, maximum: 1200 }),
    tujuan: t.String({ minLength: 1 }),
  }),
  Response: { 201: SuccessSchema, ...errorResponses },
} as const

export type Post = UnwrapModels<typeof Post>
