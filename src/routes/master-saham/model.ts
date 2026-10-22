import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema } from '#/libs/errors'
import { paginationSchema } from '#/libs/schema'

const hargaSahamResponseSchema = t.Object({
  id: t.Integer(),
  hargaNominal: t.Integer(),
  hargaJual: t.Integer(),
  updatedByName: t.String(),
  createdAt: t.String({ format: 'date-time' }),
})

export const Get = {
  Query: t.Object({
    ...paginationSchema.properties,
  }),
  Response: {
    200: t.Object({
      total: t.Integer(),
      data: t.Array(hargaSahamResponseSchema),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const LatestGet = {
  Response: {
    200: hargaSahamResponseSchema,
    401: UnauthorizedSchema,
    404: ErrorSchema,
  },
} as const

export type LatestGet = UnwrapModels<typeof LatestGet>

export const Post = {
  Body: t.Object({
    hargaJual: t.Integer({ minimum: 1 }),
  }),
  Response: {
    201: SuccessSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type Post = UnwrapModels<typeof Post>
