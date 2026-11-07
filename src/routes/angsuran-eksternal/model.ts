import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/libs/errors'
import { searchSchema } from '#/libs/schema'

const databaseIdSchema = t.Integer({ minimum: 1 })
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
    pembiayaanEksternalId: t.Optional(databaseIdSchema),
  }),
  Response: {
    200: t.Object({
      total: t.Integer(),
      data: t.Array(
        t.Object({
          id: t.Integer(),
          pembiayaanEksternalId: t.Integer(),
          kodePembiayaan: t.String(),
          kodeTransaksi: t.String(),
          tanggalTransaksi: t.String({ format: 'date' }),
          jumlahPembayaran: t.Integer(),
          jumlahPokok: t.Integer(),
          jumlahMargin: t.Integer(),
          keterangan: t.Nullable(t.String()),
          createdBy: t.Integer(),
          creatorName: t.String(),
          createdAt: t.String({ format: 'date-time' }),
        }),
      ),
    }),
    ...errorResponses,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const Post = {
  Body: t.Object({
    pembiayaanEksternalId: databaseIdSchema,
    jumlahPembayaran: t.Integer({ minimum: 1 }),
    tanggalTransaksi: t.Optional(t.String({ format: 'date' })),
    keterangan: t.Optional(t.String()),
  }),
  Response: { 201: SuccessSchema, ...errorResponses },
} as const

export type Post = UnwrapModels<typeof Post>
