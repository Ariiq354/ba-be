import type { UnwrapModels } from 'elysia'

import { t } from 'elysia'

export const OptionsGet = {
  Response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer(),
          kodeKelompok: t.String(),
          namaKelompok: t.String(),
        }),
      ),
    }),
  },
} as const

export type OptionsGet = UnwrapModels<typeof OptionsGet>
