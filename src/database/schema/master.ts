import { integer, pgEnum, snakeCase, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdUpdated } from "./common";

export const jaminanEnum = pgEnum("jaminan", ["TIDAK_ADA", "ADA"]);

export const saham = snakeCase.table("saham", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  hargaNominal: integer().notNull(),
  hargaJual: integer().notNull(),
  updatedBy: integer().notNull().references(() => user.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const margin = snakeCase.table("margin", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  minNominal: integer().notNull(),
  maxNominal: integer().notNull(),
  persenMarginTahun: integer().notNull(),
  jaminan: jaminanEnum().notNull(),
  biayaAkad: integer().notNull(),
  ...createdUpdated,
});
