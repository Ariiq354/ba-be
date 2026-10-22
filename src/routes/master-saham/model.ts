import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { paginationSchema } from '#/libs/schema'

const createHargaSahamSchema = t.Object({
  hargaJual: t.Integer({ minimum: 1 }),
})

const hargaSahamResponseSchema = t.Object({
  id: t.Integer(),
  hargaNominal: t.Integer(),
  hargaJual: t.Integer(),
  updatedByName: t.String(),
  createdAt: t.String({ format: 'date-time' }),
})

export const masterSahamModel = {
  getHargaSahamResponseSchema: t.Object({
    total: t.Integer(),
    data: t.Array(hargaSahamResponseSchema),
  }),

  getLatestHargaSahamResponseSchema: hargaSahamResponseSchema,

  getHargaSahamQuerySchema: t.Object({
    ...paginationSchema.properties,
  }),

  createHargaSahamSchema,
} as const

export type MasterSahamModel = UnwrapModels<typeof masterSahamModel>
