import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { admin as adminPlugins, openAPI, username } from "better-auth/plugins";
import { db } from "#/database";
import { relations } from "#/database/relations";
import * as schema from "#/database/schema/auth";

export const auth = betterAuth({
  trustedOrigins: ["https://ubberkahamanah.my.id"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      relations,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            banned: true,
            banReason: "Akun belum terverifikasi",
            banExpires: null,
          },
        }),
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 7,
  },
  user: {
    additionalFields: {
      idKelompok: {
        type: "number",
        input: true,
        required: true,
      },
    },
  },
  advanced: {
    database: {
      generateId: false,
      joins: true,
    },
  },
  plugins: [openAPI(), username(), adminPlugins()],
});

export type UserWithId = Omit<typeof auth.$Infer.Session.user, "id"> & {
  id: number;
};
