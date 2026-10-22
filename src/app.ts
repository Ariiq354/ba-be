import { Elysia } from 'elysia'

import { CorsPlugin } from './plugins/cors'
import { OpenApiPlugin } from './plugins/openapi'
import { Routes } from './routes'
import { AuthRoutes } from './routes/auth'

export const app = new Elysia().use(OpenApiPlugin).use(CorsPlugin).use(Routes).use(AuthRoutes)

export type App = typeof app
