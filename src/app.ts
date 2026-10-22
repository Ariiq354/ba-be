import { Elysia } from 'elysia'

import { auth } from './libs/auth'
import { CorsPlugin } from './plugins/cors'
import { OpenApiPlugin } from './plugins/openapi'
import { Routes } from './routes'

export const app = new Elysia().use(OpenApiPlugin).use(CorsPlugin).use(Routes).mount(auth.handler)

export type App = typeof app
