import { integer, pgEnum, snakeCase, text } from "drizzle-orm/pg-core";
import { createdUpdated } from "./common";

export const fileUploadStatusEnum = pgEnum("file_upload_status", [
  "pending",
  "success",
]);

export const fileUpload = snakeCase.table("file_upload", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  key: text().notNull().unique(),
  dir: text().notNull(),
  filename: text().notNull(),
  filetype: text().notNull(),
  filesize: integer().notNull(),
  status: fileUploadStatusEnum("status").default("pending").notNull(),
  ...createdUpdated,
});
