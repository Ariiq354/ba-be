import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema } from '#/libs/errors'

const amountSchema = t.Integer({ minimum: 0 })

const jurnalDetailResponseSchema = t.Object({
  id: t.Integer(),
  jurnalId: t.Integer(),
  akunId: t.Integer(),
  kodeAkun: t.String(),
  namaAkun: t.String(),
  userId: t.Integer(),
  userName: t.String(),
  debit: t.Integer(),
  kredit: t.Integer(),
})

const jurnalHeaderResponseSchema = t.Object({
  id: t.Integer(),
  kodeTransaksi: t.String(),
  tanggalTransaksi: t.String({ format: 'date' }),
  keterangan: t.Nullable(t.String()),
  createdAt: t.String({ format: 'date-time' }),
})

const flatJurnalResponseSchema = t.Object({
  ...jurnalHeaderResponseSchema.properties,
  ...jurnalDetailResponseSchema.properties,
})

export const Get = {
  Query: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    search: t.String({ default: '' }),
  }),

  Response: {
    200: t.Object({
      total: t.Integer({ minimum: 0 }),
      data: t.Array(flatJurnalResponseSchema),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const ByIdGet = {
  Params: t.Object({
    id: t.Integer(),
  }),
  Response: {
    200: t.Object({
      ...jurnalHeaderResponseSchema.properties,
      details: t.Array(jurnalDetailResponseSchema),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
  },
} as const

export type ByIdGet = UnwrapModels<typeof ByIdGet>

export const Post = {
  Body: t.Object({
    tanggalTransaksi: t.String({ format: 'date' }),
    keterangan: t.Optional(t.Nullable(t.String())),
    details: t.Array(
      t.Object({
        akunId: t.Integer(),
        debit: amountSchema,
        kredit: amountSchema,
      }),
      { minItems: 2 },
    ),
  }),

  Response: {
    201: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
  },
} as const

export type Post = UnwrapModels<typeof Post>

export const Delete = {
  Body: t.Object({
    ids: t.Array(t.Integer(), { minItems: 1 }),
  }),
  Response: {
    200: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    409: ErrorSchema,
  },
} as const

export type Delete = UnwrapModels<typeof Delete>
