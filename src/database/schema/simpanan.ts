import { date, index, integer, pgEnum, snakeCase, text, timestamp } from "drizzle-orm/pg-core";
import { akun } from "./akun";
import { user } from "./auth";
import { createdUpdated } from "./common";

export const jenisTransaksiEnum = pgEnum("jenis_transaksi", ["setoran", "penarikan"]);
export const approvedStatusEnum = pgEnum("approved_status", ["pending", "approved", "rejected"]);
export const jenisPemindahbukuanEnum = pgEnum("jenis_pemindahbukuan", ["saham_ke_saham", "tabungan_ke_tabungan", "tabungan_ke_saham"]);

export const saldoSimpanan = snakeCase.table("saldo_simpanan", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }).unique(),
  saldoTabungan: integer().notNull().default(0),
  saldoSaham: integer().notNull().default(0),
  ...createdUpdated,
});

export const mutasiSimpanan = snakeCase.table("mutasi_simpanan", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  kodeTransaksi: text().notNull().unique(),
  userId: integer().notNull().references(() => user.id),
  akunId: integer().notNull().references(() => akun.id),
  jenisTransaksi: jenisTransaksiEnum().notNull(),
  nilaiTransaksi: integer().notNull(),
  agioSaham: integer().notNull().default(0),
  saldoSetelahTransaksi: integer().notNull(),
  tanggalTransaksi: date().notNull(),
  statusApproved: approvedStatusEnum().notNull().default("pending"),
  alasanPenolakan: text(),
  keterangan: text(),
  createdBy: integer().notNull().references(() => user.id),
  approvedBy: integer().references(() => user.id),
  approvedAt: timestamp({ withTimezone: true }),
  ...createdUpdated,
}, table => [
  index("mutasi_simpanan_user_id_idx").on(table.userId),
  index("mutasi_simpanan_akun_id_idx").on(table.akunId),
  index("mutasi_simpanan_tanggal_transaksi_idx").on(table.tanggalTransaksi),
]);

export const pemindahbukuan = snakeCase.table("pemindahbukuan", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  kodeTransaksi: text().notNull().unique(),
  idUserSumber: integer().notNull().references(() => user.id),
  akunIdSumber: integer().notNull().references(() => akun.id),
  idUserTujuan: integer().notNull().references(() => user.id),
  akunIdTujuan: integer().notNull().references(() => akun.id),
  nominal: integer().notNull(),
  tipePemindahbukuan: jenisPemindahbukuanEnum().notNull(),
  tanggalTransaksi: date().notNull(),
  statusApproved: approvedStatusEnum().notNull().default("pending"),
  alasanPenolakan: text(),
  keterangan: text(),
  createdBy: integer().notNull().references(() => user.id),
  approvedBy: integer().references(() => user.id),
  approvedAt: timestamp({ withTimezone: true }),
  ...createdUpdated,
}, table => [
  index("pemindahbukuan_user_sumber_idx").on(table.idUserSumber),
  index("pemindahbukuan_user_tujuan_idx").on(table.idUserTujuan),
  index("pemindahbukuan_tanggal_transaksi_idx").on(table.tanggalTransaksi),
]);
