import { boolean, integer, pgEnum, snakeCase, text } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdUpdated } from "./common";
import { diskon } from "./diskon";

export const produkTypeEnum = pgEnum("produk_type", [
  "BOOTCAMP",
  "EBOOK",
  "COURSE",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "WAITING_VERIFICATION",
  "PAID",
]);

export const produk = snakeCase.table("produk", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  type: produkTypeEnum("type").notNull(),
  judul: text().notNull(),
  harga: integer().notNull(),
  status: boolean().default(true).notNull(),
  foto: text().notNull(),
  ...createdUpdated,
});

export const orders = snakeCase.table("orders", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
  produkId: integer().references(() => produk.id, { onDelete: "cascade" }),
  diskonId: integer().references(() => diskon.id, { onDelete: "cascade" }),
  originalHarga: integer().notNull(),
  diskonPersen: integer().default(0).notNull(),
  finalHarga: integer().notNull(),
  status: orderStatusEnum("status").default("PENDING_PAYMENT").notNull(),
  ...createdUpdated,
});
