import { Effect } from 'effect'
import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { MasterSahamModel } from './model'
import { MasterSahamService } from './service'

export const MasterSahamModules = new Elysia({
  prefix: 'master-saham',
  tags: ['Master Saham'],
})
  .use(AuthMacro)
  .get(
    '/',
    async ({ query }) => {
      const program = MasterSahamService.getPaginatedHargaSaham(query).pipe(
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil riwayat harga saham',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      query: MasterSahamModel.getHargaSahamQuerySchema,
      response: {
        200: MasterSahamModel.getHargaSahamResponseSchema,
        500: ErrorSchema,
      },
    },
  )

  .get(
    '/latest',
    async () => {
      const program = MasterSahamService.getLatestHargaSaham().pipe(
        Effect.catchTags({
          HargaSahamNotFoundError: () =>
            Effect.succeed(
              status(404, {
                code: 'HARGA_SAHAM_NOT_FOUND_ERROR',
                message: 'Harga saham belum tersedia',
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil harga saham terbaru',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      response: {
        200: MasterSahamModel.getLatestHargaSahamResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )

  .post(
    '/',
    async ({ body, user }) => {
      const program = MasterSahamService.createHargaSaham(user.id, body).pipe(
        Effect.as(status(201, { message: 'Success' })),
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mencatat harga saham',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      body: MasterSahamModel.createHargaSahamSchema,
      response: {
        201: SuccessSchema,
        500: ErrorSchema,
      },
    },
  )
