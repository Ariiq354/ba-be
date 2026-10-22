import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema } from '#/libs/errors'
import { deleteBulkSchema, idParamsSchema, paginationSchema, searchSchema } from '#/libs/schema'

const kategoriAkunValues = ['aktiva', 'pasiva', 'pendapatan', 'biaya'] as const
const normalBalanceValues = ['debit', 'kredit'] as const

export const Get = {
  Query: t.Object({
    ...paginationSchema.properties,
    ...searchSchema.properties,
    kategori: t.UnionEnum(['all', ...kategoriAkunValues], { default: 'all' }),
  }),
  Response: {
    200: t.Object({
      total: t.Integer(),
      data: t.Array(
        t.Object({
          id: t.Integer(),
          kodeAkun: t.String(),
          namaAkun: t.String(),
          kategori: t.UnionEnum(kategoriAkunValues),
          normalBalance: t.UnionEnum(normalBalanceValues),
          isActive: t.Boolean(),
        }),
      ),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const Post = {
  Body: t.Object({
    kodeAkun: t.String({ minLength: 1 }),
    namaAkun: t.String({ minLength: 1 }),
    kategori: t.UnionEnum(kategoriAkunValues),
    normalBalance: t.UnionEnum(normalBalanceValues),
    isActive: t.Boolean({ default: true }),
  }),
  Response: {
    201: SuccessSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    409: ErrorSchema,
  },
} as const

export type Post = UnwrapModels<typeof Post>

export const ByIdPatch = {
  Params: idParamsSchema,
  Body: t.Partial(Post.Body),
  Response: {
    200: SuccessSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    409: ErrorSchema,
  },
} as const

export type ByIdPatch = UnwrapModels<typeof ByIdPatch>

export const Delete = {
  Body: deleteBulkSchema,
  Response: {
    200: SuccessSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
  },
} as const

export type Delete = UnwrapModels<typeof Delete>
