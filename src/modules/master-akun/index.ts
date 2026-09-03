import { Effect } from 'effect'
import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { deleteBulkSchema, idParamsSchema } from '#/utils/schema'
import { masterAkunModel } from './model'
import { MasterAkunService } from './service'

export const MasterAkunModules = new Elysia({ prefix: 'master-akun', tags: ['Master Akun'] })
  .use(AuthMacro)
  .get(
    '/',
    async ({ query }) => {
      const program = MasterAkunService.getPaginatedAkun(query).pipe(
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil data akun',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      query: masterAkunModel.getAkunQuerySchema,
      response: {
        200: masterAkunModel.getAkunResponseSchema,
        500: ErrorSchema,
      },
    },
  )

  .post(
    '/',
    async ({ body }) => {
      const program = MasterAkunService.createAkun(body).pipe(
        Effect.as(status(201, { message: 'Success' })),
        Effect.catchTags({
          DuplicateKodeAkunError: err =>
            Effect.succeed(
              status(409, {
                code: 'DUPLICATE_KODE_AKUN_ERROR',
                message: `Kode akun '${err.kodeAkun}' sudah digunakan`,
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal membuat akun',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      body: masterAkunModel.createAkunSchema,
      response: {
        201: SuccessSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )

  .patch(
    '/:id',
    async ({ params, body }) => {
      const program = MasterAkunService.updateAkun(params.id, body).pipe(
        Effect.as(status(200, { message: 'Success' })),
        Effect.catchTags({
          DuplicateKodeAkunError: err =>
            Effect.succeed(
              status(409, {
                code: 'DUPLICATE_KODE_AKUN_ERROR',
                message: `Kode akun '${err.kodeAkun}' sudah digunakan`,
              }),
            ),
          ItemNotFoundError: err =>
            Effect.succeed(
              status(404, {
                code: 'ITEM_NOT_FOUND_ERROR',
                message: `Akun dengan ID '${err.id}' tidak ditemukan`,
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal memperbarui akun',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      params: idParamsSchema,
      body: masterAkunModel.updateAkunSchema,
      response: {
        200: SuccessSchema,
        409: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )

  .delete(
    '/',
    async ({ body }) => {
      const program = MasterAkunService.deleteAkun(body.ids).pipe(
        Effect.as(status(200, { message: 'Success' })),
        Effect.catchTags({
          ItemsNotFoundError: err =>
            Effect.succeed(
              status(404, {
                code: 'ITEM_NOT_FOUND_ERROR',
                message: `Akun dengan ID '${err.ids.join(', ')}' tidak ditemukan`,
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal menghapus akun',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
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
  )
