import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { UnauthorizedSchema } from '#/libs/errors'

const periodeSchema = {
  periodeMulai: t.String({ format: 'date' }),
  periodeSelesai: t.String({ format: 'date' }),
}

const bulanSchema = t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' })

export const Get = {
  Response: {
    200: t.Object({
      hargaSaham: t.Object({
        hargaNominal: t.Integer(),
        hargaJual: t.Nullable(t.Integer()),
        diperbaruiPada: t.Nullable(t.String({ format: 'date-time' })),
        hargaSebelumnya: t.Nullable(t.Integer()),
        perubahanNominal: t.Nullable(t.Integer()),
        perubahanPersen: t.Nullable(t.Number()),
      }),
      grafikHargaSaham: t.Object({
        ...periodeSchema,
        data: t.Array(
          t.Object({
            bulan: bulanSchema,
            hargaJual: t.Nullable(t.Integer()),
          }),
        ),
      }),
      labaBerjalan: t.Object({
        ...periodeSchema,
        total: t.Number(),
      }),
      grafikLabaBulanan: t.Array(
        t.Object({
          bulan: bulanSchema,
          pendapatan: t.Number(),
          biaya: t.Number(),
          laba: t.Number(),
        }),
      ),
    }),
    401: UnauthorizedSchema,
  },
} as const

export type Get = UnwrapModels<typeof Get>
