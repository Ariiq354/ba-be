import { index, integer, primaryKey, snakeCase, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const kelompok = snakeCase.table("kelompok", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  kodeKelompok: text().notNull().unique(),
  namaKelompok: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const kelompokPenanggungJawab = snakeCase.table("kelompok_penanggung_jawab", {
  kelompokId: integer().notNull().references(() => kelompok.id, {
    onDelete: "cascade",
  }),
  userId: integer().notNull().references(() => user.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.kelompokId, table.userId] }),
  index("kelompok_pj_user_id_idx").on(table.userId),
]);
