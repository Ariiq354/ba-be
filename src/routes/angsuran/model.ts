import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/libs/errors'
import { searchSchema } from '#/libs/schema'

import { PAYMENT_METHODS } from '../simpanan/constants'

const databaseIdSchema = t.Integer({ minimum: 1 })
const idParamsSchema = t.Object({ id: databaseIdSchema })
const paymentMethodSchema = t.UnionEnum(PAYMENT_METHODS)

const angsuranResponseSchema = t.Object({
  id: t.Integer(),
  pembiayaanId: t.Integer(),
  kodePembiayaan: t.String(),
  userId: t.Integer(),
  kodeTransaksi: t.String(),
  tanggalTransaksi: t.String({ format: 'date' }),
  jumlahPembayaran: t.Integer(),
  metodePembayaran: paymentMethodSchema,
  statusApproved: t.UnionEnum(['pending', 'approved', 'rejected']),
  alasanPenolakan: t.Nullable(t.String()),
  jurnalId: t.Nullable(t.Integer()),
  keterangan: t.Nullable(t.String()),
  createdBy: t.Integer(),
  approvedBy: t.Nullable(t.Integer()),
  approvedAt: t.Nullable(t.String({ format: 'date-time' })),
  createdAt: t.String({ format: 'date-time' }),
  updatedAt: t.String({ format: 'date-time' }),
  memberName: t.String(),
  creatorName: t.String(),
  approverName: t.Nullable(t.String()),
})

const errorResponses = {
  400: ErrorSchema,
  401: UnauthorizedSchema,
  403: ErrorSchema,
  404: ErrorSchema,
  409: ErrorSchema,
  422: ValidationErrorSchema,
} as const

export const Get = {
  Query: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    ...searchSchema.properties,
    pembiayaanId: t.Optional(databaseIdSchema),
    userId: t.Optional(databaseIdSchema),
    status: t.UnionEnum(['all', 'pending', 'approved', 'rejected'], { default: 'all' }),
  }),
  Response: {
    200: t.Object({ total: t.Integer(), data: t.Array(angsuranResponseSchema) }),
    ...errorResponses,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const RingkasanGet = {
  Query: t.Object({ pembiayaanId: databaseIdSchema }),
  Response: {
    200: t.Object({
      pembiayaanId: t.Integer(),
      totalTagihan: t.Integer(),
      totalPembayaran: t.Integer(),
      sisaTagihan: t.Integer(),
      angsuranBulanan: t.Integer(),
      targetPembayaranKumulatif: t.Integer(),
      sisaPembayaranBulanIni: t.Integer(),
      statusPelunasan: t.UnionEnum(['belum_lunas', 'lunas']),
    }),
    ...errorResponses,
  },
} as const

export type RingkasanGet = UnwrapModels<typeof RingkasanGet>

export const Post = {
  Body: t.Object({
    pembiayaanId: databaseIdSchema,
    jumlahPembayaran: t.Integer({ minimum: 1, maximum: 2_147_483_647 }),
    metodePembayaran: paymentMethodSchema,
    keterangan: t.Optional(t.String()),
  }),
  Response: { 201: SuccessSchema, ...errorResponses },
} as const

export type Post = UnwrapModels<typeof Post>

export const Delete = {
  Body: t.Object({ ids: t.Array(databaseIdSchema, { minItems: 1, uniqueItems: true }) }),
  Response: { 200: SuccessSchema, ...errorResponses },
} as const

export type Delete = UnwrapModels<typeof Delete>

export const ByIdApprovePatch = {
  Params: idParamsSchema,
  Response: { 200: SuccessSchema, ...errorResponses, 403: ForbiddenSchema },
} as const

export type ByIdApprovePatch = UnwrapModels<typeof ByIdApprovePatch>

export const ByIdRejectPatch = {
  Params: idParamsSchema,
  Body: t.Object({ alasanPenolakan: t.String({ minLength: 1 }) }),
  Response: ByIdApprovePatch.Response,
} as const

export type ByIdRejectPatch = UnwrapModels<typeof ByIdRejectPatch>
