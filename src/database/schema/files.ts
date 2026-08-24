import { integer, pgEnum, snakeCase, text } from "drizzle-orm/pg-core";
import { createdUpdated } from "./common";

export const fileStatusEnum = pgEnum("file_status", ["pending", "success"]);

export const files = snakeCase.table("files", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  publicId: text().notNull().unique(),
  filename: text().notNull(),
  mimeType: text().notNull(),
  size: integer().notNull(),
  status: fileStatusEnum().notNull().default("pending"),
  ...createdUpdated,
});
