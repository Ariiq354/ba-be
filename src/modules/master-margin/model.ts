import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'
import { paginationSchema } from '#/utils/schema'

const createMarginSchema = t.Object({
  minNominal: t.Integer({ minimum: 0 }),
  maxNominal: t.Integer({ minimum: 0 }),
  persenMarginTahun: t.Integer({ minimum: 0 }),
  jaminan: t.UnionEnum(['TIDAK_ADA', 'ADA']),
  biayaAkad: t.Integer({ minimum: 0 }),
})

export const masterMarginModel = {
  getMarginResponseSchema: t.Object({
    total: t.Integer(),
    data: t.Array(
      t.Object({
        id: t.Integer(),
        minNominal: t.Integer(),
        maxNominal: t.Integer(),
        persenMarginTahun: t.Integer(),
        jaminan: t.UnionEnum(['TIDAK_ADA', 'ADA']),
        biayaAkad: t.Integer(),
        createdAt: t.String({ format: 'date-time' }),
        updatedAt: t.String({ format: 'date-time' }),
      }),
    ),
  }),

  getMarginQuerySchema: t.Object({
    ...paginationSchema.properties,
  }),

  createMarginSchema,

  updateMarginSchema: t.Partial(createMarginSchema),
} as const

export type MasterMarginModel = {
  [key in keyof typeof masterMarginModel]: UnwrapSchema<(typeof masterMarginModel)[key]>;
}
