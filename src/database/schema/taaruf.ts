import { date, integer, pgEnum, snakeCase, text } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdUpdated } from "./common";

export const taarufStatusEnum = pgEnum("taaruf_status", [
  "PENDING",
  "APPROVED",
  "PROFILE_EXCHANGE",
  "TAARUF",
  "REJECTED",
  "CANCELLED",
  "MARRIED",
]);

export const taarufProses = snakeCase.table("taaruf_proses", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  requesterUserId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
  targetUserId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
  status: taarufStatusEnum().default("PENDING").notNull(),
  startedAt: date({ mode: "string" }),
  finishedAt: date({ mode: "string" }),
  ...createdUpdated,
});

export const taarufProsesLog = snakeCase.table("taaruf_proses_logs", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  prosesId: integer().notNull().references(() => taarufProses.id, { onDelete: "cascade" }),
  status: taarufStatusEnum().notNull(),
  keterangan: text(),
  ...createdUpdated,
});
