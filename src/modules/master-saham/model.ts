import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'
import { paginationSchema } from '#/utils/schema'

const createHargaSahamSchema = t.Object({
  hargaNominal: t.Integer({ minimum: 0 }),
  hargaJual: t.Integer({ minimum: 0 }),
})

const hargaSahamResponseSchema = t.Object({
  id: t.Number(),
  hargaNominal: t.Number(),
  hargaJual: t.Number(),
  updatedByName: t.String(),
  createdAt: t.String({ format: 'date-time' }),
})

export const masterSahamModel = {
  getHargaSahamResponseSchema: t.Object({
    total: t.Number(),
    data: t.Array(hargaSahamResponseSchema),
  }),

  getLatestHargaSahamResponseSchema: hargaSahamResponseSchema,

  getHargaSahamQuerySchema: t.Object({
    ...paginationSchema.properties,
  }),

  createHargaSahamSchema,
} as const

export type MasterSahamModel = {
  [key in keyof typeof masterSahamModel]: UnwrapSchema<(typeof masterSahamModel)[key]>;
}
