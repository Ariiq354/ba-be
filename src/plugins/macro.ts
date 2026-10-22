import Elysia from 'elysia'

import { auth } from '#/libs/auth'
import { ForbiddenError, UnauthorizedError } from '#/libs/errors'

export const AuthMacro = new Elysia({ name: 'AuthMacro' }).macro({
  auth: {
    async derive({ request: { headers } }) {
      const session = await auth.api.getSession({
        headers,
      })

      if (!session) {
        return new UnauthorizedError()
      }

      return {
        user: {
          ...session.user,
          id: Number(session.user.id),
        },
        session: session.session,
      }
    },
  },
  admin: {
    async derive({ request: { headers } }) {
      const session = await auth.api.getSession({
        headers,
      })

      if (!session) {
        return new UnauthorizedError()
      }

      if (session.user.role !== 'admin') {
        return new ForbiddenError()
      }

      return {
        user: {
          ...session.user,
          id: Number(session.user.id),
        },
        session: session.session,
      }
    },
  },
})
