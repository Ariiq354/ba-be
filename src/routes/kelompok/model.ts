import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

export const kelompokModel = {
  getKelompokOptionsResponseSchema: t.Object({
    data: t.Array(
      t.Object({
        id: t.Integer(),
        kodeKelompok: t.String(),
        namaKelompok: t.String(),
      }),
    ),
  }),
} as const

export type KelompokModel = UnwrapModels<typeof kelompokModel>
