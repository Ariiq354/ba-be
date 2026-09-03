import { Elysia } from 'elysia'
import { Modules } from './modules'
import { AuthModule } from './modules/auth'
import { CorsPlugin } from './utils/cors'
import { OpenApiPlugin } from './utils/openapi'

export const app = new Elysia()
  .use(OpenApiPlugin)
  .use(CorsPlugin)
  .use(Modules)
  .use(AuthModule)
  .listen(3000)

// eslint-disable-next-line no-console
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
