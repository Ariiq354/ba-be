import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'
import { searchSchema } from '#/utils/schema'

const postgresIntegerMax = 2_147_483_647
const databaseIdSchema = t.Integer({ minimum: 1, maximum: postgresIntegerMax })
const positiveIntegerSchema = t.Integer({ minimum: 1, maximum: postgresIntegerMax })
const transferProperties = {
  idUserSumber: t.Optional(t.Integer({
    minimum: 1,
    maximum: postgresIntegerMax,
    description: 'Anggota sumber. Jika tidak dikirim, menggunakan pengguna yang login. Admin atau PJ dapat mengajukan untuk anggota dalam cakupan aksesnya.',
  })),
  idUserTujuan: databaseIdSchema,
  keterangan: t.Optional(t.Nullable(t.String())),
}

const pemindahbukuanResponseSchema = t.Object({
  id: t.Integer(),
  kodeTransaksi: t.String(),
  idUserSumber: t.Integer(),
  akunIdSumber: t.Integer(),
  idUserTujuan: t.Integer(),
  akunIdTujuan: t.Integer(),
  nominal: t.Integer(),
  jumlahSaham: t.Integer(),
  hargaPerSaham: t.Integer(),
  hargaNominalPerSaham: t.Integer(),
  agioSaham: t.Integer(),
  jurnalId: t.Nullable(t.Integer()),
  tipePemindahbukuan: t.UnionEnum(['saham_ke_saham', 'tabungan_ke_tabungan', 'tabungan_ke_saham']),
  tanggalTransaksi: t.String({ format: 'date' }),
  statusApproved: t.UnionEnum(['pending', 'approved', 'rejected']),
  alasanPenolakan: t.Nullable(t.String()),
  keterangan: t.Nullable(t.String()),
  createdBy: t.Integer(),
  approvedBy: t.Nullable(t.Integer()),
  approvedAt: t.Nullable(t.String({ format: 'date-time' })),
  createdAt: t.String({ format: 'date-time' }),
  updatedAt: t.String({ format: 'date-time' }),
  sourceMemberName: t.String(),
  destinationMemberName: t.String(),
  sourceAccountName: t.String(),
  destinationAccountName: t.String(),
  creatorName: t.String(),
  approverName: t.Nullable(t.String()),
})

export const pemindahbukuanModel = {
  getPemindahbukuanQuerySchema: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    ...searchSchema.properties,
    userId: t.Optional(databaseIdSchema),
    status: t.UnionEnum(['all', 'pending', 'approved', 'rejected'], { default: 'all' }),
    tipePemindahbukuan: t.UnionEnum(['all', 'saham_ke_saham', 'tabungan_ke_tabungan', 'tabungan_ke_saham'], { default: 'all' }),
  }),

  getPemindahbukuanResponseSchema: t.Object({
    total: t.Integer(),
    data: t.Array(pemindahbukuanResponseSchema),
  }),

  createPemindahbukuanSchema: t.Union([
    t.Object({
      ...transferProperties,
      tipePemindahbukuan: t.Literal('tabungan_ke_tabungan'),
      nominal: positiveIntegerSchema,
    }),
    t.Object({
      ...transferProperties,
      tipePemindahbukuan: t.Literal('saham_ke_saham'),
      jumlahSaham: positiveIntegerSchema,
    }),
    t.Object({
      ...transferProperties,
      tipePemindahbukuan: t.Literal('tabungan_ke_saham'),
      idUserTujuan: t.Integer({
        minimum: 1,
        maximum: postgresIntegerMax,
        description: 'Harus sama dengan anggota sumber. Konversi tabungan ke saham hanya untuk anggota yang sama.',
      }),
      jumlahSaham: positiveIntegerSchema,
    }),
  ]),

  deletePemindahbukuanSchema: t.Object({
    ids: t.Array(databaseIdSchema, { minItems: 1, uniqueItems: true }),
  }),

  idParamsSchema: t.Object({
    id: databaseIdSchema,
  }),

  rejectPemindahbukuanSchema: t.Object({
    alasanPenolakan: t.String(),
  }),
} as const

export type PemindahbukuanModel = {
  [key in keyof typeof pemindahbukuanModel]: UnwrapSchema<(typeof pemindahbukuanModel)[key]>
}
