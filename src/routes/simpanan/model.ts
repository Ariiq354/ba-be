import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/libs/errors'
import { searchSchema } from '#/libs/schema'

import { PAYMENT_METHODS, SHARE_PAYMENT_METHODS } from './constants'

const databaseIdSchema = t.Integer({ minimum: 1 })
const positiveIntegerSchema = t.Integer({ minimum: 1 })
const idParamsSchema = t.Object({
  id: databaseIdSchema,
})

const paymentMethodSchema = t.UnionEnum(PAYMENT_METHODS)

const nullableDescriptionSchema = t.Optional(t.Nullable(t.String()))
const targetUserSchema = t.Optional(
  t.Integer({
    minimum: 1,
    description:
      'Pemilik simpanan. Jika tidak dikirim, menggunakan pengguna yang login. Hanya admin atau PJ kelompok tujuan yang dapat mengajukan untuk pengguna lain.',
  }),
)

const mutasiResponseSchema = t.Object({
  id: t.Integer(),
  kodeTransaksi: t.String(),
  userId: t.Integer(),
  akunId: t.Integer(),
  jenisSimpanan: t.UnionEnum(['tabungan', 'saham']),
  jenisTransaksi: t.UnionEnum(['setoran', 'penarikan']),
  nilaiTransaksi: t.Integer(),
  jumlahSaham: t.Integer(),
  hargaPerSaham: t.Integer(),
  hargaNominalPerSaham: t.Integer(),
  agioSaham: t.Integer(),
  saldoSetelahTransaksi: t.Nullable(t.Integer()),
  jumlahSahamSetelahTransaksi: t.Nullable(t.Integer()),
  jurnalId: t.Nullable(t.Integer()),
  tanggalTransaksi: t.String({ format: 'date' }),
  statusApproved: t.UnionEnum(['pending', 'approved', 'rejected']),
  alasanPenolakan: t.Nullable(t.String()),
  keterangan: t.Nullable(t.String()),
  createdBy: t.Integer(),
  approvedBy: t.Nullable(t.Integer()),
  approvedAt: t.Nullable(t.String({ format: 'date-time' })),
  createdAt: t.String({ format: 'date-time' }),
  updatedAt: t.String({ format: 'date-time' }),
  memberName: t.String(),
  accountName: t.String(),
  creatorName: t.String(),
  approverName: t.Nullable(t.String()),
})

export const SaldoGet = {
  Query: t.Object({
    userId: t.Optional(
      t.Integer({
        minimum: 1,
        description:
          'Anggota pemilik saldo. Jika tidak dikirim, menggunakan pengguna yang login. Akses anggota lain dibatasi berdasarkan peran dan kelompok PJ.',
      }),
    ),
  }),

  Response: {
    200: t.Object({
      saldoTabungan: t.Integer(),
      jumlahSaham: t.Integer(),
      totalPenarikanPending: t.Integer(),
      totalPemindahbukuanPending: t.Integer(),
      totalSahamPending: t.Integer(),
      saldoEfektif: t.Integer(),
      jumlahSahamEfektif: t.Integer(),
    }),
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type SaldoGet = UnwrapModels<typeof SaldoGet>

export const MutasiGet = {
  Query: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    ...searchSchema.properties,
    userId: t.Optional(databaseIdSchema),
    status: t.UnionEnum(['all', 'pending', 'approved', 'rejected'], { default: 'all' }),
    jenisTransaksi: t.UnionEnum(['all', 'setoran', 'penarikan'], { default: 'all' }),
    jenisSimpanan: t.UnionEnum(['all', 'tabungan', 'saham'], { default: 'all' }),
  }),

  Response: {
    200: t.Object({
      total: t.Integer(),
      data: t.Array(mutasiResponseSchema),
    }),
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type MutasiGet = UnwrapModels<typeof MutasiGet>

export const MutasiSetoranTabunganPost = {
  Body: t.Object({
    userId: targetUserSchema,
    metodePembayaran: paymentMethodSchema,
    nilaiTransaksi: positiveIntegerSchema,
    keterangan: nullableDescriptionSchema,
  }),

  Response: {
    201: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type MutasiSetoranTabunganPost = UnwrapModels<typeof MutasiSetoranTabunganPost>

export const MutasiSetoranSahamPost = {
  Body: t.Object({
    userId: targetUserSchema,
    metodePembayaran: t.UnionEnum(SHARE_PAYMENT_METHODS),
    jumlahSaham: positiveIntegerSchema,
    keterangan: nullableDescriptionSchema,
  }),
  Response: MutasiSetoranTabunganPost.Response,
} as const

export type MutasiSetoranSahamPost = UnwrapModels<typeof MutasiSetoranSahamPost>

export const MutasiPenarikanPost = {
  Body: t.Object({
    userId: targetUserSchema,
    metodePembayaran: paymentMethodSchema,
    nilaiTransaksi: positiveIntegerSchema,
    keterangan: nullableDescriptionSchema,
  }),

  Response: {
    201: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type MutasiPenarikanPost = UnwrapModels<typeof MutasiPenarikanPost>

export const MutasiDelete = {
  Body: t.Object({
    ids: t.Array(databaseIdSchema, { minItems: 1, uniqueItems: true }),
  }),
  Response: {
    200: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type MutasiDelete = UnwrapModels<typeof MutasiDelete>

export const MutasiByIdApprovePatch = {
  Params: idParamsSchema,
  Response: {
    200: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    409: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type MutasiByIdApprovePatch = UnwrapModels<typeof MutasiByIdApprovePatch>

export const MutasiByIdRejectPatch = {
  Params: idParamsSchema,
  Body: t.Object({
    alasanPenolakan: t.String(),
  }),
  Response: {
    200: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    409: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type MutasiByIdRejectPatch = UnwrapModels<typeof MutasiByIdRejectPatch>
