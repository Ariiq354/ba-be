import Elysia from 'elysia'
import { auth } from './auth'

function toSessionContext(session: typeof auth.$Infer.Session) {
  return {
    user: {
      ...session.user,
      id: Number(session.user.id),
    },
    session: session.session,
  }
}

export const AuthMacro = new Elysia({ name: 'AuthMacro' }).macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const session = await auth.api.getSession({
        headers,
      })

      if (!session) {
        return status(401)
      }

      return toSessionContext(session)
    },
  },
  admin: {
    async resolve({ status, request: { headers } }) {
      const session = await auth.api.getSession({
        headers,
      })

      if (!session) {
        return status(401)
      }

      if (session.user.role !== 'admin') {
        return status(403)
      }
      return toSessionContext(session)
    },
  },
})
