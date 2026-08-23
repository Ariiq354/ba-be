import { boolean, date, integer, snakeCase, text } from "drizzle-orm/pg-core";
import { createdUpdated } from "./common";

export const diskon = snakeCase.table("diskon", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  kode: text().notNull().unique(),
  persen: integer().notNull(),
  batasWaktu: date({ mode: "string" }).notNull(),
  batasPemakai: integer().notNull(),
  jumlahDipakai: integer().notNull().default(0),
  status: boolean().notNull().default(true),
  ...createdUpdated,
});
