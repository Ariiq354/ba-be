import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema } from '#/libs/errors'
import { deleteBulkSchema, idParamsSchema, paginationSchema } from '#/libs/schema'

export const Get = {
  Query: t.Object({
    ...paginationSchema.properties,
  }),
  Response: {
    200: t.Object({
      total: t.Integer(),
      data: t.Array(
        t.Object({
          id: t.Integer(),
          minNominal: t.Integer(),
          maxNominal: t.Nullable(t.Integer(), {
            description: 'Null berarti tanpa batas maksimum (dan seterusnya).',
          }),
          persenMarginTahun: t.Integer(),
          jaminan: t.UnionEnum(['TIDAK_ADA', 'ADA']),
          biayaAkad: t.Integer(),
          createdAt: t.String({ format: 'date-time' }),
          updatedAt: t.String({ format: 'date-time' }),
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
    minNominal: t.Integer({ minimum: 0 }),
    maxNominal: t.Nullable(t.Integer({ minimum: 0 }), {
      description: 'Null berarti tanpa batas maksimum (dan seterusnya).',
    }),
    persenMarginTahun: t.Integer({ minimum: 0 }),
    jaminan: t.UnionEnum(['TIDAK_ADA', 'ADA']),
    biayaAkad: t.Integer({ minimum: 0 }),
  }),
  Response: {
    201: SuccessSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
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
