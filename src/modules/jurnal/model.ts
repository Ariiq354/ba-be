import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'

const amountSchema = t.Integer({ minimum: 0, maximum: 2147483647 })

const jurnalDetailResponseSchema = t.Object({
  id: t.Integer(),
  jurnalId: t.Integer(),
  akunId: t.Integer(),
  kodeAkun: t.String(),
  namaAkun: t.String(),
  debit: t.Integer(),
  kredit: t.Integer(),
})

const flatJurnalResponseSchema = t.Object({
  ...jurnalDetailResponseSchema.properties,
  kodeTransaksi: t.String(),
  tanggalTransaksi: t.String({ format: 'date' }),
  keterangan: t.Nullable(t.String()),
  userId: t.Integer(),
  userName: t.Nullable(t.String()),
  createdAt: t.String({ format: 'date-time' }),
})

export const jurnalModel = {
  getJurnalQuerySchema: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    search: t.String({ default: '' }),
  }),

  getJurnalResponseSchema: t.Object({
    total: t.Integer({ minimum: 0 }),
    data: t.Array(flatJurnalResponseSchema),
  }),

  getJurnalByIdParamsSchema: t.Object({
    id: t.Integer(),
  }),

  getJurnalByIdResponseSchema: t.Object({
    id: t.Integer(),
    kodeTransaksi: t.String(),
    tanggalTransaksi: t.String({ format: 'date' }),
    keterangan: t.Nullable(t.String()),
    userId: t.Integer(),
    userName: t.Nullable(t.String()),
    createdAt: t.String({ format: 'date-time' }),
    details: t.Array(jurnalDetailResponseSchema),
  }),

  createJurnalSchema: t.Object({
    tanggalTransaksi: t.String({ format: 'date' }),
    keterangan: t.Optional(t.Nullable(t.String())),
    details: t.Array(
      t.Object({
        akunId: t.Integer(),
        debit: amountSchema,
        kredit: amountSchema,
      }),
      { minItems: 2 },
    ),
  }),

  deleteJurnalSchema: t.Object({
    ids: t.Array(t.Integer(), { minItems: 1 }),
  }),
} as const

export type JurnalModel = {
  [key in keyof typeof jurnalModel]: UnwrapSchema<(typeof jurnalModel)[key]>;
}
