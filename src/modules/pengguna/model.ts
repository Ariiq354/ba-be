import { paginationSchema, searchSchema } from "#/utils/schema";
import { t, type UnwrapSchema } from "elysia";

const nullableStringSchema = t.Nullable(t.String());
const optionalNullableStringSchema = t.Optional(t.Nullable(t.String({ minLength: 1 })));
const optionalNullableWilayahIdSchema = t.Optional(
  t.Nullable(t.String({ minLength: 1, pattern: "\\S" })),
);

export const PenggunaModel = {
  getProfileResponseSchema: t.Object({
    id: t.Number(),
    name: t.String(),
    email: t.String(),
    image: nullableStringSchema,
    noAnggota: nullableStringSchema,
    noHp: nullableStringSchema,
    nik: nullableStringSchema,
    namaBank: nullableStringSchema,
    noRekening: nullableStringSchema,
    pemilikRekening: nullableStringSchema,
    jalan: nullableStringSchema,
    idProvinsi: nullableStringSchema,
    idKabupatenKota: nullableStringSchema,
    idKecamatan: nullableStringSchema,
    idDesaKelurahan: nullableStringSchema,
  }),

  updateProfileSchema: t.Object({
    name: t.Optional(t.String({ minLength: 1 })),
    imageAction: t.Optional(t.UnionEnum(["keep", "remove", "update"])),
    image: t.Optional(t.String({ minLength: 1 })),
    noHp: optionalNullableStringSchema,
    nik: optionalNullableStringSchema,
    namaBank: optionalNullableStringSchema,
    noRekening: optionalNullableStringSchema,
    pemilikRekening: optionalNullableStringSchema,
    jalan: optionalNullableStringSchema,
    idProvinsi: optionalNullableWilayahIdSchema,
    idKabupatenKota: optionalNullableWilayahIdSchema,
    idKecamatan: optionalNullableWilayahIdSchema,
    idDesaKelurahan: optionalNullableWilayahIdSchema,
  }),

  getPenggunaQuerySchema: t.Object({
    ...paginationSchema.properties,
    ...searchSchema.properties,
    status: t.UnionEnum(["all", "pending", "verified"], { default: "all" }),
  }),

  getPenggunaResponseSchema: t.Object({
    total: t.Number(),
    data: t.Array(
      t.Object({
        id: t.Number(),
        name: t.String(),
        username: nullableStringSchema,
        email: t.String(),
        role: nullableStringSchema,
        banned: t.Nullable(t.Boolean()),
        banReason: nullableStringSchema,
        idKelompok: t.Number(),
        namaKelompok: t.String(),
        kodeKelompok: t.String(),
        noAnggota: nullableStringSchema,
        createdAt: t.String({ format: "date-time" }),
      }),
    ),
  }),

  setPjSchema: t.Object({
    isPj: t.Boolean(),
  }),

  verifyPenggunaResponseSchema: t.Object({
    noAnggota: t.String(),
  }),
} as const;

export type PenggunaModel = {
  [key in keyof typeof PenggunaModel]: UnwrapSchema<(typeof PenggunaModel)[key]>;
};
