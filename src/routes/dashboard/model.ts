import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

import { UnauthorizedSchema } from '#/libs/errors'

const periodeSchema = {
  periodeMulai: t.String({ format: 'date' }),
  periodeSelesai: t.String({ format: 'date' }),
}

export const Get = {
  Response: {
    200: t.Object({
      hargaSaham: t.Object({
        hargaJual: t.Nullable(t.Integer()),
        perubahanNominal: t.Nullable(t.Integer()),
        perubahanPersen: t.Nullable(t.Number()),
      }),
      grafikPembiayaanTahunan: t.Object({
        ...periodeSchema,
        data: t.Array(
          t.Object({
            tahun: t.Integer(),
            total: t.Number(),
          }),
        ),
      }),
      pembiayaanBerjalan: t.Object({
        periodeMulai: t.String({ format: 'date' }),
        total: t.Number(),
      }),
      labaBerjalan: t.Object({
        periodeMulai: t.String({ format: 'date' }),
        total: t.Number(),
      }),
      grafikLabaTahunan: t.Array(
        t.Object({
          tahun: t.Integer(),
          laba: t.Number(),
        }),
      ),
    }),
    401: UnauthorizedSchema,
  },
} as const

export type Get = UnwrapModels<typeof Get>
