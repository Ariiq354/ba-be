import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, UnauthorizedSchema } from '#/libs/errors'

export const PresignedPost = {
  Body: t.Object({
    dir: t.String({ minLength: 1 }),
    filename: t.String({ minLength: 1 }),
    filesize: t.Integer({ minimum: 1 }),
    fileType: t.String({ minLength: 1 }),
  }),

  Response: {
    201: t.Object({
      uploadUrl: t.String(),
      key: t.String(),
    }),
    400: ErrorSchema,
    401: UnauthorizedSchema,
  },
} as const

export type PresignedPost = UnwrapModels<typeof PresignedPost>
