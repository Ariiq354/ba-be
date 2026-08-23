import Elysia from "elysia";
import { auth } from "../utils/auth";

export const AuthMacro = new Elysia({ name: "AuthMacro" }).macro({
  auth: {
    async derive({ status, request: { headers } }) {
      const session = await auth.api.getSession({
        headers,
      });
      if (!session) return status(401);
      return {
        user: {
          ...session.user,
          id: Number(session.user.id),
        },
        session: session.session,
      };
    },
  },
  admin: {
    async derive({ status, request: { headers } }) {
      const session = await auth.api.getSession({
        headers,
      });
      if (!session) return status(401);

      if (session.user.role !== "admin") return status(403);
      return {
        user: {
          ...session.user,
          id: Number(session.user.id),
        },
        session: session.session,
      };
    },
  },
});
