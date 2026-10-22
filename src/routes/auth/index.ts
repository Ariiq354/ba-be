import Elysia from 'elysia'

import { auth } from '#/libs/auth'

// Elysia 2 strips mount prefixes; Better Auth must receive the original /api/auth URL.
export const AuthRoutes = new Elysia({ name: 'AuthRoutes' }).mount(auth.handler)
