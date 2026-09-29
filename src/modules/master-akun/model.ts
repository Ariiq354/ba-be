import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'
import { paginationSchema, searchSchema } from '#/utils/schema'

const kategoriAkunValues = ['aktiva', 'pasiva', 'pendapatan', 'biaya'] as const
const normalBalanceValues = ['debit', 'kredit'] as const

const createAkunSchema = t.Object({
  kodeAkun: t.String({ minLength: 1 }),
  namaAkun: t.String({ minLength: 1 }),
  kategori: t.UnionEnum(kategoriAkunValues),
  normalBalance: t.UnionEnum(normalBalanceValues),
  isActive: t.Boolean({ default: true }),
})

export const masterAkunModel = {
  getAkunResponseSchema: t.Object({
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

  getAkunQuerySchema: t.Object({
    ...paginationSchema.properties,
    ...searchSchema.properties,
    kategori: t.UnionEnum(['all', ...kategoriAkunValues], { default: 'all' }),
  }),

  createAkunSchema,

  updateAkunSchema: t.Partial(createAkunSchema),
} as const

export type MasterAkunModel = {
  [key in keyof typeof masterAkunModel]: UnwrapSchema<(typeof masterAkunModel)[key]>;
}
