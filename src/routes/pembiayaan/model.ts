import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/libs/errors'
import { searchSchema } from '#/libs/schema'

import { PAYMENT_METHODS } from '../simpanan/constants'

const databaseIdSchema = t.Integer({ minimum: 1 })
const idParamsSchema = t.Object({ id: databaseIdSchema })
const paymentMethodSchema = t.UnionEnum(PAYMENT_METHODS)
const marginPercentSchema = t.Number({ minimum: 0 })

const pembiayaanResponseSchema = t.Object({
  id: t.Integer(),
  kodeTransaksi: t.String(),
  userId: t.Integer(),
  metodePembayaran: paymentMethodSchema,
  jumlahPokok: t.Integer(),
  persenMarginTahun: t.Number(),
  jumlahMargin: t.Integer(),
  biayaAkad: t.Integer(),
  totalPembiayaan: t.Integer(),
  jangkaWaktuBulan: t.Integer(),
  tujuan: t.String(),
  tanggalPembiayaan: t.String({ format: 'date' }),
  jurnalId: t.Nullable(t.Integer()),
  statusApproved: t.UnionEnum(['pending', 'approved', 'rejected']),
  alasanPenolakan: t.Nullable(t.String()),
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
  422: ValidationErrorSchema,
} as const

export const Get = {
  Query: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    ...searchSchema.properties,
    userId: t.Optional(databaseIdSchema),
    status: t.UnionEnum(['all', 'pending', 'approved', 'rejected'], { default: 'all' }),
  }),
  Response: {
    200: t.Object({ total: t.Integer(), data: t.Array(pembiayaanResponseSchema) }),
    ...errorResponses,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const Post = {
  Body: t.Object({
    userId: t.Optional(
      t.Integer({
        minimum: 1,
        description:
          'Pemilik pembiayaan. Default pengguna login. Pengajuan untuk anggota lain dibatasi peran dan kelompok PJ.',
      }),
    ),
    jumlahPokok: t.Integer({ minimum: 1 }),
    jangkaWaktuBulan: t.Integer({ minimum: 1 }),
    tujuan: t.String({ minLength: 1 }),
    metodePembayaran: paymentMethodSchema,
    persenMarginTahun: t.Optional({
      ...marginPercentSchema,
      description:
        'Override khusus admin, dibulatkan ke 2 angka desimal. Jika tidak dikirim, menggunakan master margin.',
    }),
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
  Response: {
    200: SuccessSchema,
    ...errorResponses,
    403: ForbiddenSchema,
    409: ErrorSchema,
  },
} as const

export type ByIdApprovePatch = UnwrapModels<typeof ByIdApprovePatch>

export const ByIdRejectPatch = {
  Params: idParamsSchema,
  Body: t.Object({ alasanPenolakan: t.String({ minLength: 1 }) }),
  Response: ByIdApprovePatch.Response,
} as const

export type ByIdRejectPatch = UnwrapModels<typeof ByIdRejectPatch>
