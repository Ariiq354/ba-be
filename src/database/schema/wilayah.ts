import { bigint, integer, snakeCase, text } from "drizzle-orm/pg-core";

export const provinsi = snakeCase.table("provinsi", {
  id: integer().primaryKey(),
  name: text().notNull(),
});

export const kota = snakeCase.table("kota", {
  id: integer().primaryKey(),
  provinsiId: integer()
    .notNull()
    .references(() => provinsi.id, { onDelete: "cascade" }),
  name: text().notNull(),
});

export const kecamatan = snakeCase.table("kecamatan", {
  id: integer().primaryKey(),
  kotaId: integer()
    .notNull()
    .references(() => kota.id, { onDelete: "cascade" }),
  name: text().notNull(),
});

export const desa = snakeCase.table("desa", {
  id: bigint({ mode: "number" }).primaryKey(),
  kecamatanId: integer()
    .notNull()
    .references(() => kecamatan.id, { onDelete: "cascade" }),
  name: text().notNull(),
});
