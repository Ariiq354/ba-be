import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'
import { AkunId } from '#/utils/akunId'
import { searchSchema } from '#/utils/schema'

const postgresIntegerMax = 2_147_483_647
const databaseIdSchema = t.Integer({ minimum: 1, maximum: postgresIntegerMax })
const positiveIntegerSchema = t.Integer({ minimum: 1, maximum: postgresIntegerMax })

const paymentAccountSchema = t.Union([
  t.Literal(AkunId.KAS),
  t.Literal(AkunId.BANKMUAMALAT),
  t.Literal(AkunId.BANKBSM),
  t.Literal(AkunId.BANKBCA),
])

const nullableDescriptionSchema = t.Optional(t.Nullable(t.String()))

const mutasiResponseSchema = t.Object({
  id: t.Integer(),
  kodeTransaksi: t.String(),
  userId: t.Integer(),
  akunId: t.Integer(),
  jenisSimpanan: t.UnionEnum(['tabungan', 'saham']),
  jenisTransaksi: t.UnionEnum(['setoran', 'penarikan']),
  nilaiTransaksi: t.Integer(),
  jumlahSaham: t.Integer(),
  hargaPerSaham: t.Integer(),
  hargaNominalPerSaham: t.Integer(),
  agioSaham: t.Integer(),
  saldoSetelahTransaksi: t.Nullable(t.Integer()),
  jumlahSahamSetelahTransaksi: t.Nullable(t.Integer()),
  jurnalId: t.Nullable(t.Integer()),
  tanggalTransaksi: t.String({ format: 'date' }),
  statusApproved: t.UnionEnum(['pending', 'approved', 'rejected']),
  alasanPenolakan: t.Nullable(t.String()),
  keterangan: t.Nullable(t.String()),
  createdBy: t.Integer(),
  approvedBy: t.Nullable(t.Integer()),
  approvedAt: t.Nullable(t.String({ format: 'date-time' })),
  createdAt: t.String({ format: 'date-time' }),
  updatedAt: t.String({ format: 'date-time' }),
  memberName: t.String(),
  accountName: t.String(),
  creatorName: t.String(),
  approverName: t.Nullable(t.String()),
})

export const simpananModel = {
  getSaldoResponseSchema: t.Object({
    saldoTabungan: t.Integer(),
    jumlahSaham: t.Integer(),
    totalPenarikanPending: t.Integer(),
    saldoEfektif: t.Integer(),
  }),

  getMutasiQuerySchema: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    ...searchSchema.properties,
    userId: t.Optional(databaseIdSchema),
    status: t.UnionEnum(['all', 'pending', 'approved', 'rejected'], { default: 'all' }),
    jenisTransaksi: t.UnionEnum(['all', 'setoran', 'penarikan'], { default: 'all' }),
    jenisSimpanan: t.UnionEnum(['all', 'tabungan', 'saham'], { default: 'all' }),
  }),

  getMutasiResponseSchema: t.Object({
    total: t.Integer(),
    data: t.Array(mutasiResponseSchema),
  }),

  createSetoranSchema: t.Union([
    t.Object({
      jenisSimpanan: t.Literal('tabungan'),
      akunId: paymentAccountSchema,
      nilaiTransaksi: positiveIntegerSchema,
      keterangan: nullableDescriptionSchema,
    }),
    t.Object({
      jenisSimpanan: t.Literal('saham'),
      akunId: paymentAccountSchema,
      jumlahSaham: positiveIntegerSchema,
      keterangan: nullableDescriptionSchema,
    }),
  ]),

  createPenarikanSchema: t.Object({
    akunId: paymentAccountSchema,
    nilaiTransaksi: positiveIntegerSchema,
    keterangan: nullableDescriptionSchema,
  }),

  deleteMutasiSchema: t.Object({
    ids: t.Array(databaseIdSchema, { minItems: 1, uniqueItems: true }),
  }),

  idParamsSchema: t.Object({
    id: databaseIdSchema,
  }),

  rejectMutasiSchema: t.Object({
    alasanPenolakan: t.String(),
  }),
} as const

export type SimpananModel = {
  [key in keyof typeof simpananModel]: UnwrapSchema<(typeof simpananModel)[key]>
}
