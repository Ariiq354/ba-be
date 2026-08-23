import { integer, snakeCase, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { produk } from "./produk";

export const course = snakeCase.table("course", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  produkId: integer().references(() => produk.id, { onDelete: "cascade" }).notNull().unique(),
  deskripsi: text(),
  konten: text(),
  namaPublisher: text(),
});

export const courseSection = snakeCase.table("course_section", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  courseId: integer().references(() => course.id, { onDelete: "cascade" }),
  judul: text().notNull(),
  order: integer().notNull(),
});

export const courseLesson = snakeCase.table("course_lesson", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  sectionId: integer().references(() => courseSection.id, { onDelete: "cascade" }),
  judul: text().notNull(),
  videoUrl: text().notNull(),
  duration: integer(),
  order: integer().notNull(),
});

export const courseProgress = snakeCase.table("course_progress", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
  lessonId: integer().notNull().references(() => courseLesson.id),
  completedAt: timestamp().defaultNow().notNull(),
});
