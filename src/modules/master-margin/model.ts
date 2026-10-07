import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'
import { paginationSchema } from '#/utils/schema'

const createMarginSchema = t.Object({
  minNominal: t.Integer({ minimum: 0 }),
  maxNominal: t.Nullable(t.Integer({ minimum: 0 }), {
    description: 'Null berarti tanpa batas maksimum (dan seterusnya).',
  }),
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

  getMarginQuerySchema: t.Object({
    ...paginationSchema.properties,
  }),

  createMarginSchema,

  updateMarginSchema: t.Partial(createMarginSchema),
} as const

export type MasterMarginModel = {
  [key in keyof typeof masterMarginModel]: UnwrapSchema<(typeof masterMarginModel)[key]>;
}
