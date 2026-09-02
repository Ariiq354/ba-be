import { t, type UnwrapSchema } from "elysia";

export const KelompokModel = {
  getKelompokOptionsResponseSchema: t.Object({
    data: t.Array(
      t.Object({
        id: t.Number(),
        kodeKelompok: t.String(),
        namaKelompok: t.String(),
      }),
    ),
  }),
} as const;

export type KelompokModel = {
  [key in keyof typeof KelompokModel]: UnwrapSchema<(typeof KelompokModel)[key]>;
};
