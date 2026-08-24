import { index, integer, snakeCase, text } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { kecamatan, kelurahan, kota, provinsi } from "./wilayah";

export const userProfile = snakeCase.table("user_profile", {
  idUser: integer().primaryKey().references(() => user.id, { onDelete: "cascade" }),
  noAnggota: text().unique(),
  noHp: text(),
  nik: text().unique(),
  namaBank: text(),
  noRekening: text(),
  pemilikRekening: text(),
  jalan: text(),
  idProvinsi: text().references(() => provinsi.id, { onDelete: "set null" }),
  idKota: text().references(() => kota.id, { onDelete: "set null" }),
  idKecamatan: text().references(() => kecamatan.id, { onDelete: "set null" }),
  idKelurahan: text().references(() => kelurahan.id, { onDelete: "set null" }),
}, table => [
  index("user_profile_provinsi_id_idx").on(table.idProvinsi),
  index("user_profile_kota_id_idx").on(table.idKota),
  index("user_profile_kecamatan_id_idx").on(table.idKecamatan),
  index("user_profile_kelurahan_id_idx").on(table.idKelurahan),
]);
