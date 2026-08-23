import {
  boolean,
  index,
  integer,
  snakeCase,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdUpdated } from "./common";

export const user = snakeCase.table("user", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
  noTelepon: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull(),
  image: text(),
  role: text(),
  banned: boolean().default(false),
  banReason: text(),
  banExpires: timestamp({ withTimezone: true }),
  ...createdUpdated,
}, table => [uniqueIndex("email_idx").on(table.email)]);

export const session = snakeCase.table("session", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  token: text().notNull().unique(),
  ipAddress: text(),
  userAgent: text(),
  userId: integer()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text(),
  ...createdUpdated,
}, table => [
  index("userid_idx_session").on(table.userId),
  index("token_idx").on(table.token),
]);

export const account = snakeCase.table("account", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: integer()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  issuer: text().notNull(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  password: text(),
  ...createdUpdated,
}, table => [index("userid_idx").on(table.userId)]);

export const verification = snakeCase.table("verification", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ...createdUpdated,
}, table => [index("verification_identifier_idx").on(table.identifier)]);
