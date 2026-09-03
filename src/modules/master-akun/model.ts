import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'
import { paginationSchema, searchSchema } from '#/utils/schema'

const createAkunSchema = t.Object({
  kodeAkun: t.String({ minLength: 1 }),
  namaAkun: t.String({ minLength: 1 }),
  kategori: t.UnionEnum(['aktiva', 'pasiva', 'pendapatan', 'biaya']),
  normalBalance: t.UnionEnum(['debit', 'kredit']),
  isActive: t.Boolean({ default: true }),
})

export const masterAkunModel = {
  getAkunResponseSchema: t.Object({
    total: t.Number(),
    data: t.Array(
      t.Object({
        id: t.Number(),
        kodeAkun: t.String(),
        namaAkun: t.String(),
        kategori: t.UnionEnum(['aktiva', 'biaya', 'pasiva', 'pendapatan']),
        normalBalance: t.UnionEnum(['debit', 'kredit']),
        isActive: t.Boolean(),
      }),
    ),
  }),

  getAkunQuerySchema: t.Object({
    ...paginationSchema.properties,
    ...searchSchema.properties,
    kategori: t.UnionEnum(['all', 'aktiva', 'pasiva', 'pendapatan', 'biaya'], { default: 'all' }),
  }),

  createAkunSchema,

  updateAkunSchema: t.Partial(createAkunSchema),
} as const

export type MasterAkunModel = {
  [key in keyof typeof masterAkunModel]: UnwrapSchema<(typeof masterAkunModel)[key]>;
}
