import { ErrorSchema, SuccessSchema } from "#/utils/errors";
import { AuthMacro } from "#/utils/macro";
import { idParamsSchema } from "#/utils/schema";
import Elysia, { status } from "elysia";
import { Effect } from "effect";
import { PenggunaModel } from "./model";
import { PenggunaService } from "./service";

export const PenggunaModules = new Elysia({ prefix: "pengguna", tags: ["Pengguna"] })
  .use(AuthMacro)
  .get(
    "/profile",
    async ({ user }) => {
      const program = PenggunaService.getProfile(user.id).pipe(
        Effect.catchTags({
          ItemNotFoundError: () =>
            Effect.succeed(
              status(404, {
                code: "ITEM_NOT_FOUND_ERROR",
                message: "Data profil pengguna tidak ditemukan",
              }),
            ),
          DatabaseError: (err) =>
            Effect.logError("Database error:", err.error).pipe(
              Effect.as(
                status(500, {
                  code: "DATABASE_ERROR",
                  message: "Gagal mengambil data profil pengguna",
                }),
              ),
            ),
        }),
      );

      return Effect.runPromise(program);
    },
    {
      auth: true,
      response: {
        200: PenggunaModel.getProfileResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .patch(
    "/profile",
    async ({ user, body }) => {
      const program = PenggunaService.updateProfile(user.id, body).pipe(
        Effect.as(status(200, { message: "Success" })),
        Effect.catchTags({
          ProfileImageRequiredError: () =>
            Effect.succeed(
              status(400, {
                code: "PROFILE_IMAGE_REQUIRED_ERROR",
                message: "Foto profil baru wajib diisi untuk tindakan update",
              }),
            ),
          InvalidProfileImageError: () =>
            Effect.succeed(
              status(400, {
                code: "INVALID_PROFILE_IMAGE_ERROR",
                message: "File foto profil tidak valid atau sudah digunakan",
              }),
            ),
          ItemNotFoundError: () =>
            Effect.succeed(
              status(404, {
                code: "ITEM_NOT_FOUND_ERROR",
                message: "Data pengguna tidak ditemukan",
              }),
            ),
          DuplicateNikError: (err) =>
            Effect.succeed(
              status(409, {
                code: "DUPLICATE_NIK_ERROR",
                message: `NIK '${err.nik}' sudah digunakan`,
              }),
            ),
          DatabaseError: (err) =>
            Effect.logError("Database error:", err.error).pipe(
              Effect.as(
                status(500, {
                  code: "DATABASE_ERROR",
                  message: "Gagal memperbarui data profil pengguna",
                }),
              ),
            ),
        }),
      );

      return Effect.runPromise(program);
    },
    {
      auth: true,
      body: PenggunaModel.updateProfileSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .get(
    "/",
    async ({ query }) => {
      const program = PenggunaService.getPaginatedPengguna(query).pipe(
        Effect.catchTags({
          DatabaseError: (err) =>
            Effect.logError("Database error:", err.error).pipe(
              Effect.as(
                status(500, {
                  code: "DATABASE_ERROR",
                  message: "Gagal mengambil daftar pengguna",
                }),
              ),
            ),
        }),
      );

      return Effect.runPromise(program);
    },
    {
      admin: true,
      query: PenggunaModel.getPenggunaQuerySchema,
      response: {
        200: PenggunaModel.getPenggunaResponseSchema,
        500: ErrorSchema,
      },
    },
  )
  .patch(
    "/:id/verifikasi",
    async ({ params }) => {
      const program = PenggunaService.verifyPengguna(params.id).pipe(
        Effect.catchTags({
          ItemNotFoundError: () =>
            Effect.succeed(
              status(404, {
                code: "ITEM_NOT_FOUND_ERROR",
                message: "Pengguna tidak ditemukan",
              }),
            ),
          KelompokNotFoundError: () =>
            Effect.succeed(
              status(404, {
                code: "KELOMPOK_NOT_FOUND_ERROR",
                message: "Kelompok pengguna tidak ditemukan",
              }),
            ),
          PenggunaAlreadyVerifiedError: () =>
            Effect.succeed(
              status(409, {
                code: "PENGGUNA_ALREADY_VERIFIED_ERROR",
                message: "Pengguna sudah terverifikasi sebelumnya",
              }),
            ),
          PenggunaNotPendingVerificationError: () =>
            Effect.succeed(
              status(409, {
                code: "PENGGUNA_NOT_PENDING_VERIFICATION_ERROR",
                message: "Pengguna sedang diblokir secara administratif",
              }),
            ),
          DatabaseError: (err) =>
            Effect.logError("Database error:", err.error).pipe(
              Effect.as(
                status(500, {
                  code: "DATABASE_ERROR",
                  message: "Gagal memverifikasi pengguna",
                }),
              ),
            ),
        }),
      );

      return Effect.runPromise(program);
    },
    {
      admin: true,
      params: idParamsSchema,
      response: {
        200: PenggunaModel.verifyPenggunaResponseSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .patch(
    "/:id/pj",
    async ({ params, body }) => {
      const program = PenggunaService.setPenggunaPj(params.id, body.isPj).pipe(
        Effect.as(status(200, { message: "Success" })),
        Effect.catchTags({
          ItemNotFoundError: () =>
            Effect.succeed(
              status(404, {
                code: "ITEM_NOT_FOUND_ERROR",
                message: "Pengguna tidak ditemukan",
              }),
            ),
          AdminCannotBePjError: () =>
            Effect.succeed(
              status(400, {
                code: "ADMIN_CANNOT_BE_PJ_ERROR",
                message: "Pengguna dengan role admin tidak dapat dijadikan PJ Kelompok",
              }),
            ),
          PenggunaUnverifiedError: () =>
            Effect.succeed(
              status(400, {
                code: "PENGGUNA_UNVERIFIED_ERROR",
                message: "Pengguna belum terverifikasi dan tidak dapat dijadikan PJ Kelompok",
              }),
            ),
          PenggunaBannedError: () =>
            Effect.succeed(
              status(400, {
                code: "PENGGUNA_BANNED_ERROR",
                message: "Pengguna yang sedang diblokir tidak dapat dijadikan PJ Kelompok",
              }),
            ),
          DatabaseError: (err) =>
            Effect.logError("Database error:", err.error).pipe(
              Effect.as(
                status(500, {
                  code: "DATABASE_ERROR",
                  message: "Gagal mengubah penanggung jawab Kelompok",
                }),
              ),
            ),
        }),
      );

      return Effect.runPromise(program);
    },
    {
      admin: true,
      params: idParamsSchema,
      body: PenggunaModel.setPjSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  );
