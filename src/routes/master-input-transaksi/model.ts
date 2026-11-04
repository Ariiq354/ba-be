import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema } from '#/libs/errors'
import { deleteBulkSchema, idParamsSchema, paginationSchema, searchSchema } from '#/libs/schema'

export const OptionsGet = {
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer(),
          nama: t.String(),
        }),
      ),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type OptionsGet = UnwrapModels<typeof OptionsGet>

export const Get = {
  Query: t.Object({
    ...paginationSchema.properties,
    ...searchSchema.properties,
    isActive: t.Optional(t.Boolean()),
  }),
  Response: {
    200: t.Object({
      total: t.Integer({ minimum: 0 }),
      data: t.Array(
        t.Object({
          id: t.Integer(),
          nama: t.String(),
          akunDebitId: t.Integer(),
          kodeAkunDebit: t.String(),
          namaAkunDebit: t.String(),
          akunKreditId: t.Integer(),
          kodeAkunKredit: t.String(),
          namaAkunKredit: t.String(),
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
    nama: t.String({ minLength: 1 }),
    akunDebitId: t.Integer({ minimum: 1 }),
    akunKreditId: t.Integer({ minimum: 1 }),
    isActive: t.Boolean({ default: true }),
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

export const ByIdPatch = {
  Params: idParamsSchema,
  Body: t.Partial(
    t.Object({
      nama: t.String({ minLength: 1 }),
      akunDebitId: t.Integer({ minimum: 1 }),
      akunKreditId: t.Integer({ minimum: 1 }),
      isActive: t.Boolean(),
    }),
    { minProperties: 1 },
  ),
  Response: {
    200: SuccessSchema,
    400: ErrorSchema,
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
