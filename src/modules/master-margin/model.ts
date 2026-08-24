import { paginationSchema } from "#/utils/schema";
import { t, type UnwrapSchema } from "elysia";

const createMarginSchema = t.Object({
  minNominal: t.Integer({ minimum: 0 }),
  maxNominal: t.Integer({ minimum: 0 }),
  persenMarginTahun: t.Integer({ minimum: 0 }),
  jaminan: t.UnionEnum(["TIDAK_ADA", "ADA"]),
  biayaAkad: t.Integer({ minimum: 0 }),
});

export const MasterMarginModel = {
  getMarginResponseSchema: t.Object({
    total: t.Number(),
    data: t.Array(
      t.Object({
        id: t.Number(),
        minNominal: t.Number(),
        maxNominal: t.Number(),
        persenMarginTahun: t.Number(),
        jaminan: t.UnionEnum(["TIDAK_ADA", "ADA"]),
        biayaAkad: t.Number(),
        createdAt: t.String({ format: "date-time" }),
        updatedAt: t.String({ format: "date-time" }),
      }),
    ),
  }),

  getMarginQuerySchema: t.Object({
    ...paginationSchema.properties,
  }),

  createMarginSchema,

  updateMarginSchema: t.Partial(createMarginSchema),
} as const;

export type MasterMarginModel = {
  [key in keyof typeof MasterMarginModel]: UnwrapSchema<(typeof MasterMarginModel)[key]>;
};
