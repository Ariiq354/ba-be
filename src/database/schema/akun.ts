import { boolean, integer, pgEnum, snakeCase, text, timestamp } from "drizzle-orm/pg-core";

export const kategoriAkunEnum = pgEnum("kategori_akun", [
  "aktiva",
  "pasiva",
  "pendapatan",
  "biaya",
]);

export const normalBalanceEnum = pgEnum("normal_balance", ["debit", "kredit"]);

export const akun = snakeCase.table("akun", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  kodeAkun: text().notNull().unique(),
  namaAkun: text().notNull(),
  kategori: kategoriAkunEnum().notNull(),
  normalBalance: normalBalanceEnum().notNull(),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
