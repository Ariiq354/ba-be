import { integer, snakeCase, text } from "drizzle-orm/pg-core";
import { produk } from "./produk";

export const ebook = snakeCase.table("ebook", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  produkId: integer().references(() => produk.id, { onDelete: "cascade" }).notNull().unique(),
  deskripsi: text(),
  konten: text(),
  pdfUrl: text().notNull(),
});
