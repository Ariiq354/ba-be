import { openapi } from "@elysia/openapi";
import { auth } from "../utils/auth";
import Elysia, { status } from "elysia";
import { timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>;
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema());

export const OpenAPI = {
  getPaths: (prefix = "/api/auth") =>
    getSchema().then(({ paths }) => {
      const reference: typeof paths = Object.create(null);

      for (const path of Object.keys(paths)) {
        const key = prefix + path;
        reference[key] = paths[path];

        for (const method of Object.keys(paths[path])) {
          const operation = (reference[key] as any)[method];

          operation.tags = ["Better Auth"];
        }
      }

      return reference;
    }) as Promise<any>,
  components: getSchema().then(({ components }) => components) as Promise<any>,
} as const;

export const OpenApiPlugin = new Elysia({ prefix: "api" })
  .onBeforeHandle(({ headers, path, set }) => {
    if (path.startsWith("/api/docs")) {
      const username = process.env.DOCS_USERNAME;
      const password = process.env.DOCS_PASSWORD;

      if (username && password) {
        const authHeader = headers.authorization;

        if (authHeader && authHeader.startsWith("Basic ")) {
          const credentials = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
          const [reqUser, reqPass] = credentials.split(":");

          if (
            reqUser &&
            reqPass &&
            safeCompare(reqUser, username) &&
            safeCompare(reqPass, password)
          ) {
            return;
          }
        }

        set.headers["www-authenticate"] = 'Basic realm="API Documentation"';
        return status(401, "Unauthorized");
      }
    }
  })
  .use(
    openapi({
      specPath: "/docs/json",
      path: "/docs",
      scalar: {
        defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
      },
      documentation: {
        info: {
          title: "Berkah Amanah Backend Documentation",
          version: "1.0.0",
          description: "Berkah Amanah Backend API",
        },
        components: await OpenAPI.components,
        paths: await OpenAPI.getPaths(),
      },
    }),
  );
