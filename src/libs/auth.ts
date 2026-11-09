import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'
import { createAuthMiddleware, isAPIError } from 'better-auth/api'
import { hashPassword } from 'better-auth/crypto'
import { admin as adminPlugins, openAPI, username } from 'better-auth/plugins'
import { defaultRoles, userAc } from 'better-auth/plugins/admin/access'

import { FRONTEND_ORIGINS } from './config'
import { db } from './database'
import { relations } from './database/relations'
import * as schema from './database/schema/auth'
import { isLegacyPasswordHash, verifyPassword } from './password'

const roles = {
  ...defaultRoles,
  pj: userAc,
}

export const auth = betterAuth({
  trustedOrigins: FRONTEND_ORIGINS,
  database: drizzleAdapter(db, {
    provider: 'pg',
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
            banReason: 'Pengguna belum terverifikasi',
            banExpires: null,
          },
        }),
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (
        (ctx.path !== '/sign-in/email' && ctx.path !== '/sign-in/username') ||
        !ctx.context.newSession ||
        isAPIError(ctx.context.returned)
      ) {
        return
      }

      const account = await ctx.context.internalAdapter.findCredentialAccount(ctx.context.newSession.user.id)
      if (!account?.password || !isLegacyPasswordHash(account.password)) {
        return
      }
      if (!(await verifyPassword({ hash: account.password, password: ctx.body.password }))) {
        return
      }

      const password = await hashPassword(ctx.body.password)
      await ctx.context.adapter.update({
        model: 'account',
        where: [
          { field: 'id', value: account.id },
          { field: 'password', value: account.password },
        ],
        update: { password },
      })
    }),
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
    password: { verify: verifyPassword },
  },
  user: {
    additionalFields: {
      noHp: {
        type: 'string',
        input: true,
        required: true,
      },
      idKelompok: {
        type: 'number',
        input: true,
        required: true,
      },
    },
    validateUserInfo: async ({ source, user }) => {
      if (source.action === 'create-user' && source.method === 'email-password' && !user.image?.trim()) {
        return {
          error: 'AVATAR_REQUIRED',
          errorDescription: 'Foto profil wajib diisi',
        }
      }
    },
  },
  advanced: {
    database: {
      generateId: false,
      joins: true,
    },
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
      partitioned: true,
    },
  },
  plugins: [openAPI(), username(), adminPlugins({ roles })],
})
