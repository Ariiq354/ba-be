import { paginationSchema, searchSchema } from "#/utils/schema";
import { t, type UnwrapSchema } from "elysia";

const createAkunSchema = t.Object({
  kodeAkun: t.String({ minLength: 1 }),
  namaAkun: t.String({ minLength: 1 }),
  kategori: t.UnionEnum(["aktiva", "pasiva", "pendapatan", "biaya"]),
  normalBalance: t.UnionEnum(["debit", "kredit"]),
  isActive: t.Boolean({ default: true }),
});

export const MasterAkunModel = {
  getAkunQuerySchema: t.Object({
    ...paginationSchema.properties,
    ...searchSchema.properties,
    kategori: t.UnionEnum(["all", "aktiva", "pasiva", "pendapatan", "biaya"], { default: "all" }),
  }),

  createAkunSchema,

  updateAkunSchema: t.Partial(createAkunSchema),
} as const;

export type MasterAkunModel = {
  [key in keyof typeof MasterAkunModel]: UnwrapSchema<(typeof MasterAkunModel)[key]>;
};
