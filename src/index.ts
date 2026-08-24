import { Elysia } from "elysia";
import { OpenApiPlugin } from "./utils/openapi";
import { CorsPlugin } from "./utils/cors";
import { AuthModule } from "./modules/auth";
import { Modules } from "./modules";

export const app = new Elysia()
  .use(OpenApiPlugin)
  .use(CorsPlugin)
  .use(Modules)
  .use(AuthModule)
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
