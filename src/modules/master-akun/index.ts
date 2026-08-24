import Elysia, { status } from "elysia";
import { MasterAkunModel } from "./model";
import { MasterAkunService } from "./service";
import { Effect } from "effect";
import { deleteBulkSchema, idParamsSchema } from "#/utils/schema";
import { AuthMacro } from "#/lib/macro";

export const MasterAkunModules = new Elysia({ prefix: "master-akun", tags: ["Master Akun"] })
  .use(AuthMacro)
  .get(
    "/",
    ({ query }) => {
      const program: Effect.Effect<unknown, never> = MasterAkunService.getPaginatedAkun(query).pipe(
        Effect.catchTags({
          DatabaseError: (err) => {
            console.error("Database error:", err.error);

            return Effect.succeed(
              status(500, {
                code: "DATABASE_ERROR",
                message: "Gagal mengambil data akun",
              }),
            );
          },
        }),
      );

      return Effect.runPromise(program);
    },
    {
      admin: true,
      query: MasterAkunModel.getAkunQuerySchema,
    },
  )

  .post(
    "/",
    ({ body }) => {
      const program: Effect.Effect<unknown, never> = MasterAkunService.createAkun(body).pipe(
        Effect.catchTags({
          DuplicateKodeAkunError: (err) => {
            return Effect.succeed(
              status(500, {
                code: "DUPLICATE_KODE_AKUN_ERROR",
                message: `Kode akun '${err.kodeAkun}' sudah digunakan`,
              }),
            );
          },
          DatabaseError: (err) => {
            console.error("Database error:", err.error);

            return Effect.succeed(
              status(500, {
                code: "DATABASE_ERROR",
                message: "Gagal membuat akun",
              }),
            );
          },
        }),
      );

      return Effect.runPromise(program);
    },
    {
      admin: true,
      body: MasterAkunModel.createAkunSchema,
    },
  )

  .patch(
    "/:id",
    ({ params, body }) => {
      const program: Effect.Effect<unknown, never> = MasterAkunService.updateAkun(
        params.id,
        body,
      ).pipe(
        Effect.catchTags({
          DuplicateKodeAkunError: (err) => {
            return Effect.succeed(
              status(500, {
                code: "DUPLICATE_KODE_AKUN_ERROR",
                message: `Kode akun '${err.kodeAkun}' sudah digunakan`,
              }),
            );
          },
          ItemNotFoundError: (err) => {
            return Effect.succeed(
              status(404, {
                code: "ITEM_NOT_FOUND_ERROR",
                message: `Akun dengan ID '${err.id}' tidak ditemukan`,
              }),
            );
          },
          DatabaseError: (err) => {
            console.error("Database error:", err.error);

            return Effect.succeed(
              status(500, {
                code: "DATABASE_ERROR",
                message: "Gagal memperbarui akun",
              }),
            );
          },
        }),
      );

      return Effect.runPromise(program);
    },
    {
      admin: true,
      params: idParamsSchema,
      body: MasterAkunModel.updateAkunSchema,
    },
  )

  .delete(
    "/",
    ({ body }) => {
      const program: Effect.Effect<unknown, never> = MasterAkunService.deleteAkun(body.ids).pipe(
        Effect.catchTags({
          ItemsNotFoundError: (err) => {
            return Effect.succeed(
              status(404, {
                code: "ITEM_NOT_FOUND_ERROR",
                message: `Akun dengan ID '${err.ids.join(", ")}' tidak ditemukan`,
              }),
            );
          },
          DatabaseError: (err) => {
            console.error("Database error:", err.error);

            return Effect.succeed(
              status(500, {
                code: "DATABASE_ERROR",
                message: "Gagal menghapus akun",
              }),
            );
          },
        }),
      );

      return Effect.runPromise(program);
    },
    {
      admin: true,
      body: deleteBulkSchema,
    },
  );
