import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema } from '#/libs/errors'

const amountSchema = t.Integer({ minimum: 0 })

const laporanQuerySchema = t.Object({
  tahun: t.Integer({ minimum: 1, maximum: 9999 }),
})

const jumlahBulananSchema = t.Array(t.Integer(), {
  minItems: 12,
  maxItems: 12,
  description: 'Mutasi bersih Januari sampai Desember, tanpa saldo bulan sebelumnya.',
})

const laporanAkunProperties = {
  id: t.Integer(),
  namaAkun: t.String(),
  jumlahBulanan: jumlahBulananSchema,
  jumlah: t.Integer(),
}

const jurnalDetailResponseSchema = t.Object({
  kodeAkun: t.String(),
  namaAkun: t.String(),
  userId: t.Integer(),
  userName: t.String(),
  debit: t.Integer(),
  kredit: t.Integer(),
})

const jurnalHeaderResponseSchema = t.Object({
  id: t.Integer(),
  kodeTransaksi: t.String(),
  tanggalTransaksi: t.String({ format: 'date' }),
  keterangan: t.Nullable(t.String()),
})

const jurnalResponseSchema = t.Object({
  ...jurnalHeaderResponseSchema.properties,
  details: t.Array(jurnalDetailResponseSchema),
})

export const Get = {
  Query: t.Object({
    page: t.Integer({ minimum: 1, default: 1 }),
    limit: t.Integer({ minimum: 1, maximum: 100, default: 10 }),
    search: t.String({ default: '' }),
  }),

  Response: {
    200: t.Object({
      total: t.Integer({ minimum: 0 }),
      data: t.Array(jurnalResponseSchema),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type Get = UnwrapModels<typeof Get>

export const NeracaGet = {
  Query: laporanQuerySchema,
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          ...laporanAkunProperties,
          kategori: t.UnionEnum(['aktiva', 'pasiva']),
        }),
      ),
      ringkasan: t.Object({
        aktivaBulanan: jumlahBulananSchema,
        pasivaBulanan: jumlahBulananSchema,
        totalAktiva: t.Integer(),
        totalPasiva: t.Integer(),
      }),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type NeracaGet = UnwrapModels<typeof NeracaGet>

export const LabaRugiGet = {
  Query: laporanQuerySchema,
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          ...laporanAkunProperties,
          kategori: t.UnionEnum(['pendapatan', 'biaya']),
        }),
      ),
      ringkasan: t.Object({
        pendapatanBulanan: jumlahBulananSchema,
        biayaBulanan: jumlahBulananSchema,
        labaRugiBulanan: jumlahBulananSchema,
        totalPendapatan: t.Integer(),
        totalBiaya: t.Integer(),
        totalLabaRugi: t.Integer(),
      }),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
  },
} as const

export type LabaRugiGet = UnwrapModels<typeof LabaRugiGet>

export const Post = {
  Body: t.Object({
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

  Response: {
    201: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
  },
} as const

export type Post = UnwrapModels<typeof Post>

export const Delete = {
  Body: t.Object({
    ids: t.Array(t.Integer(), { minItems: 1 }),
  }),
  Response: {
    200: SuccessSchema,
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    409: ErrorSchema,
  },
} as const

export type Delete = UnwrapModels<typeof Delete>
