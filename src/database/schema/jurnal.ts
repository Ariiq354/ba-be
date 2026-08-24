import {
  date,
  index,
  integer,
  snakeCase,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { akun } from "./akun";
import { user } from "./auth";

export const jurnal = snakeCase.table("jurnal", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  kodeTransaksi: text().notNull().unique(),
  tanggalTransaksi: date().notNull(),
  userId: integer().notNull().references(() => user.id),
  keterangan: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("jurnal_user_id_idx").on(table.userId),
  index("jurnal_tanggal_transaksi_idx").on(table.tanggalTransaksi),
]);

export const jurnalDetail = snakeCase.table("jurnal_detail", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  jurnalId: integer().notNull().references(() => jurnal.id, {
    onDelete: "cascade",
  }),
  akunId: integer().notNull().references(() => akun.id),
  debit: integer().notNull().default(0),
  kredit: integer().notNull().default(0),
}, table => [
  index("jurnal_detail_jurnal_id_idx").on(table.jurnalId),
  index("jurnal_detail_akun_id_idx").on(table.akunId),
]);
