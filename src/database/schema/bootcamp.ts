import { integer, pgEnum, snakeCase, text } from "drizzle-orm/pg-core";
import { produk } from "./produk";

export const bootcampTypeEnum = pgEnum("bootcamp_type", [
  "ONLINE",
  "OFFLINE",
  "HYBRID",
]);

export const bootcamp = snakeCase.table("bootcamp", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  produkId: integer().references(() => produk.id, { onDelete: "cascade" }).notNull().unique(),
  deskripsi: text(),
  konten: text(),
  tipe: bootcampTypeEnum().notNull(),
  tempat: text().notNull(),
  waktu: text().notNull(),
  pembicara: text().notNull(),
  googleMapLink: text(),
  meetingLink: text(),
});
