import { index, snakeCase, text } from "drizzle-orm/pg-core";

export const provinsi = snakeCase.table("provinsi", {
  id: text().primaryKey(),
  provinsi: text().notNull(),
});

export const kota = snakeCase.table("kota", {
  id: text().primaryKey(),
  idProvinsi: text().notNull().references(() => provinsi.id),
  kota: text().notNull(),
}, table => [
  index("kota_provinsi_id_idx").on(table.idProvinsi),
]);

export const kecamatan = snakeCase.table("kecamatan", {
  id: text().primaryKey(),
  idKota: text().notNull().references(() => kota.id),
  kecamatan: text().notNull(),
}, table => [
  index("kecamatan_kota_id_idx").on(table.idKota),
]);

export const kelurahan = snakeCase.table("kelurahan", {
  id: text().primaryKey(),
  idKecamatan: text().notNull().references(() => kecamatan.id),
  kelurahan: text().notNull(),
}, table => [
  index("kelurahan_kecamatan_id_idx").on(table.idKecamatan),
]);
