import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'
import { admin as adminPlugins, openAPI, username } from 'better-auth/plugins'
import { defaultRoles, userAc } from 'better-auth/plugins/admin/access'
import { db } from '#/database'
import { relations } from '#/database/relations'
import * as schema from '#/database/schema/auth'
import { FRONTEND_ORIGINS } from './config'

const roles = {
  ...defaultRoles,
  pj: userAc,
  wanhat: userAc,
}

export const PENDING_VERIFICATION_BAN_REASON = 'Pengguna belum terverifikasi'

export function isPendingVerificationBanReason(reason: string | null): boolean {
  return reason === PENDING_VERIFICATION_BAN_REASON
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
        before: async user => ({
          data: {
            ...user,
            banned: true,
            banReason: PENDING_VERIFICATION_BAN_REASON,
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
      if (
        source.action === 'create-user'
        && source.method === 'email-password'
        && !user.image?.trim()
      ) {
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

export type UserWithId = Omit<typeof auth.$Infer.Session.user, 'id'> & {
  id: number
}
