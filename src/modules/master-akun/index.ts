import Elysia, { status } from "elysia";
import { MasterAkunModel } from "./model";
import { MasterAkunService } from "./service";
import { Effect } from "effect";
import { deleteBulkSchema, idParamsSchema } from "#/utils/schema";
import { AuthMacro } from "#/lib/macro";
import { ErrorSchema, SuccessSchema } from "#/utils/errors";

export const MasterAkunModules = new Elysia({ prefix: "master-akun", tags: ["Master Akun"] })
  .use(AuthMacro)
  .get(
    "/",
    async ({ query }) => {
      const program = MasterAkunService.getPaginatedAkun(query).pipe(
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
      response: {
        200: MasterAkunModel.getAkunResponseSchema,
        500: ErrorSchema,
      },
    },
  )

  .post(
    "/",
    async ({ body }) => {
      const program = MasterAkunService.createAkun(body).pipe(
        Effect.catchTags({
          DuplicateKodeAkunError: (err) => {
            return Effect.succeed(
              status(421, {
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

      await Effect.runPromise(program);

      return status(201, { message: "Success" });
    },
    {
      admin: true,
      body: MasterAkunModel.createAkunSchema,
      response: {
        201: SuccessSchema,
        421: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )

  .patch(
    "/:id",
    async ({ params, body }) => {
      const program = MasterAkunService.updateAkun(params.id, body).pipe(
        Effect.catchTags({
          DuplicateKodeAkunError: (err) => {
            return Effect.succeed(
              status(421, {
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

      await Effect.runPromise(program);

      return status(200, { message: "Success" });
    },
    {
      admin: true,
      params: idParamsSchema,
      body: MasterAkunModel.updateAkunSchema,
      response: {
        200: SuccessSchema,
        421: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )

  .delete(
    "/",
    async ({ body }) => {
      const program = MasterAkunService.deleteAkun(body.ids).pipe(
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

      await Effect.runPromise(program);

      return status(200, { message: "Success" });
    },
    {
      admin: true,
      body: deleteBulkSchema,
      response: {
        200: SuccessSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  );
