import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'

export const kelompokModel = {
  getKelompokOptionsResponseSchema: t.Object({
    data: t.Array(
      t.Object({
        id: t.Number(),
        kodeKelompok: t.String(),
        namaKelompok: t.String(),
      }),
    ),
  }),
} as const

export type KelompokModel = {
  [key in keyof typeof kelompokModel]: UnwrapSchema<(typeof kelompokModel)[key]>;
}
