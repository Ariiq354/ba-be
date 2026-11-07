import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/libs/errors'
import { jumlahSahamSchema, searchSchema } from '#/libs/schema'

const databaseIdSchema = t.Integer({ minimum: 1 })
const positiveIntegerSchema = t.Integer({ minimum: 1 })
const idParamsSchema = t.Object({
  id: databaseIdSchema,
})
const transferProperties = {
  idUserSumber: t.Optional(
    t.Integer({
      minimum: 1,
      description:
        'Anggota sumber. Jika tidak dikirim, menggunakan pengguna yang login. Admin atau PJ dapat mengajukan untuk anggota dalam cakupan aksesnya.',
    }),
  ),
  idUserTujuan: databaseIdSchema,
  keterangan: t.Optional(t.Nullable(t.String())),
}

const pemindahbukuanResponseSchema = t.Object({
  id: t.Integer(),
  kodeTransaksi: t.String(),
  idUserSumber: t.Integer(),
  idUserTujuan: t.Nullable(t.Integer()),
  nominal: t.Integer(),
  jumlahSaham: jumlahSahamSchema,
  hargaPerSaham: t.Integer(),
  hargaNominalPerSaham: t.Integer(),
  agioSaham: t.Integer(),
  tipePemindahbukuan: t.UnionEnum([
    'saham_ke_saham',
    'tabungan_ke_tabungan',
    'tabungan_ke_saham',
    'pembelian_kembali_saham',
  ]),
  tanggalTransaksi: t.String({ format: 'date' }),
  statusApproved: t.UnionEnum(['pending', 'approved', 'rejected']),
  alasanPenolakan: t.Nullable(t.String()),
  keterangan: t.Nullable(t.String()),
  createdBy: t.Integer(),
  approvedAt: t.Nullable(t.String({ format: 'date-time' })),
  createdAt: t.String({ format: 'date-time' }),
  sourceMemberName: t.String(),
  destinationMemberName: t.Nullable(t.String()),
  sourceAccountName: t.String(),
  destinationAccountName: t.String(),
  creatorName: t.String(),
  approverName: t.Nullable(t.String()),
})

export const Get = {
  Query: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    ...searchSchema.properties,
    userId: t.Optional(databaseIdSchema),
    status: t.UnionEnum(['all', 'pending', 'approved', 'rejected'], { default: 'all' }),
    tipePemindahbukuan: t.UnionEnum(
      ['all', 'saham_ke_saham', 'tabungan_ke_tabungan', 'tabungan_ke_saham', 'pembelian_kembali_saham'],
      { default: 'all' },
    ),
  }),

  Response: {
    200: t.Object({
      total: t.Integer(),
      data: t.Array(pemindahbukuanResponseSchema),
    }),
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const PendingCountGet = {
  Response: {
    200: t.Object({ total: t.Integer({ minimum: 0 }) }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type PendingCountGet = UnwrapModels<typeof PendingCountGet>

export const Post = {
  Body: t.Union([
    t.Object({
      ...transferProperties,
      tipePemindahbukuan: t.Literal('tabungan_ke_tabungan'),
      nominal: positiveIntegerSchema,
    }),
    t.Object({
      ...transferProperties,
      tipePemindahbukuan: t.Literal('saham_ke_saham'),
      jumlahSaham: positiveIntegerSchema,
    }),
    t.Object({
      ...transferProperties,
      tipePemindahbukuan: t.Literal('tabungan_ke_saham'),
      idUserTujuan: t.Integer({
        minimum: 1,
        description: 'Harus sama dengan anggota sumber. Konversi tabungan ke saham hanya untuk anggota yang sama.',
      }),
      jumlahSaham: positiveIntegerSchema,
    }),
    t.Object(
      {
        tipePemindahbukuan: t.Literal('pembelian_kembali_saham'),
        idUserSumber: databaseIdSchema,
        idUserTujuan: t.Optional(t.Null()),
        jumlahSaham: t.Number({ minimum: 0.5, multipleOf: 0.5 }),
        keterangan: transferProperties.keterangan,
      },
      { additionalProperties: false },
    ),
  ]),

  Response: {
    201: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type Post = UnwrapModels<typeof Post>

export const Delete = {
  Body: t.Object({
    ids: t.Array(databaseIdSchema, { minItems: 1, uniqueItems: true }),
  }),
  Response: {
    200: SuccessSchema,
    401: UnauthorizedSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    422: ValidationErrorSchema,
  },
} as const

export type Delete = UnwrapModels<typeof Delete>

export const ByIdApprovePatch = {
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

export type ByIdApprovePatch = UnwrapModels<typeof ByIdApprovePatch>

export const ByIdRejectPatch = {
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

export type ByIdRejectPatch = UnwrapModels<typeof ByIdRejectPatch>
