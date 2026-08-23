import { Elysia } from "elysia";
import { OpenApiPlugin } from "./lib/openapi";
import { CorsPlugin } from "./lib/cors";
import { AuthModule } from "./modules/auth";

export const app = new Elysia()
  .use(AuthModule)
  .use(OpenApiPlugin)
  .use(CorsPlugin)
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
