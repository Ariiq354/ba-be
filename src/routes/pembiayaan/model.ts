import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/libs/errors'
import { searchSchema } from '#/libs/schema'

import { PAYMENT_METHODS } from '../simpanan/constants'

const databaseIdSchema = t.Integer({ minimum: 1 })
const idParamsSchema = t.Object({ id: databaseIdSchema })
const paymentMethodSchema = t.UnionEnum(PAYMENT_METHODS)
const marginPercentSchema = t.Integer({ minimum: 0 })

const pembiayaanResponseSchema = t.Object({
  id: t.Integer(),
  kodeTransaksi: t.String(),
  userId: t.Integer(),
  metodePembayaran: paymentMethodSchema,
  jumlahPokok: t.Integer(),
  persenMarginTahun: t.Integer(),
  jumlahMargin: t.Integer(),
  biayaAkad: t.Integer(),
  totalPembiayaan: t.Integer(),
  jangkaWaktuBulan: t.Integer(),
  tujuan: t.String(),
  tanggalPengajuan: t.String({ format: 'date' }),
  tanggalTransfer: t.Nullable(t.String({ format: 'date' })),
  tanggalPembiayaan: t.Nullable(t.String({ format: 'date' })),
  statusTransfer: t.UnionEnum(['belum_transfer', 'sudah_transfer']),
  transferredAt: t.Nullable(t.String({ format: 'date-time' })),
  statusApproved: t.UnionEnum(['pending', 'approved', 'rejected']),
  alasanPenolakan: t.Nullable(t.String()),
  createdBy: t.Integer(),
  approvedAt: t.Nullable(t.String({ format: 'date-time' })),
  createdAt: t.String({ format: 'date-time' }),
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
    statusTransfer: t.UnionEnum(['all', 'belum_transfer', 'sudah_transfer'], { default: 'all' }),
  }),
  Response: {
    200: t.Object({ total: t.Integer(), data: t.Array(pembiayaanResponseSchema) }),
    ...errorResponses,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const MonitoringGet = {
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          kodeTransaksi: t.String(),
          memberName: t.String(),
          jumlahPokok: t.Integer(),
          jumlahMargin: t.Integer(),
          biayaAkad: t.Integer(),
          totalPembiayaan: t.Integer(),
          tujuan: t.String(),
          jangkaWaktuBulan: t.Integer(),
          sisaPembiayaan: t.Integer(),
          tanggalAkhirAngsuran: t.Nullable(t.String({ format: 'date' })),
        }),
      ),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type MonitoringGet = UnwrapModels<typeof MonitoringGet>

export const PendingCountGet = {
  Response: {
    200: t.Object({ total: t.Integer({ minimum: 0 }) }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type PendingCountGet = UnwrapModels<typeof PendingCountGet>

export const OptionsGet = {
  Query: t.Object({ userId: databaseIdSchema }),
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer(),
          tujuan: t.String(),
          totalTagihan: t.Integer(),
          sisaTagihan: t.Integer(),
          angsuranBulanan: t.Integer(),
          sisaPembayaranBulanIni: t.Integer(),
        }),
      ),
    }),
    ...errorResponses,
  },
} as const

export type OptionsGet = UnwrapModels<typeof OptionsGet>

export const SimulasiMarginPost = {
  Body: t.Object({
    jumlahPokok: t.Integer({ minimum: 1 }),
    jangkaWaktuBulan: t.Optional(t.Integer({ minimum: 1 })),
    persenMarginTahun: t.Optional({
      ...marginPercentSchema,
      description: 'Persen margin tahunan manual. Jika tidak dikirim, menggunakan master margin.',
    }),
  }),
  Response: {
    200: t.Object({
      persenMarginTahun: t.Optional(marginPercentSchema),
      jumlahMargin: t.Optional(t.Integer({ minimum: 0 })),
    }),
    ...errorResponses,
  },
} as const

export type SimulasiMarginPost = UnwrapModels<typeof SimulasiMarginPost>

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
      description: 'Override khusus admin berupa bilangan bulat. Jika tidak dikirim, menggunakan master margin.',
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

export const ByIdTransferPatch = {
  Params: idParamsSchema,
  Response: ByIdApprovePatch.Response,
} as const

export type ByIdTransferPatch = UnwrapModels<typeof ByIdTransferPatch>

export const ByIdRejectPatch = {
  Params: idParamsSchema,
  Body: t.Object({ alasanPenolakan: t.String({ minLength: 1 }) }),
  Response: ByIdApprovePatch.Response,
} as const

export type ByIdRejectPatch = UnwrapModels<typeof ByIdRejectPatch>
