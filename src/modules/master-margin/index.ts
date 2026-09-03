import { Effect } from 'effect'
import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { deleteBulkSchema, idParamsSchema } from '#/utils/schema'
import { MasterMarginModel } from './model'
import { MasterMarginService } from './service'

export const MasterMarginModules = new Elysia({
  prefix: 'master-margin',
  tags: ['Master Margin'],
})
  .use(AuthMacro)
  .get(
    '/',
    async ({ query }) => {
      const program = MasterMarginService.getPaginatedMargin(query).pipe(
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil data margin',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      query: MasterMarginModel.getMarginQuerySchema,
      response: {
        200: MasterMarginModel.getMarginResponseSchema,
        500: ErrorSchema,
      },
    },
  )

  .post(
    '/',
    async ({ body }) => {
      const program = MasterMarginService.createMargin(body).pipe(
        Effect.as(status(201, { message: 'Success' })),
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal membuat margin',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      body: MasterMarginModel.createMarginSchema,
      response: {
        201: SuccessSchema,
        500: ErrorSchema,
      },
    },
  )

  .patch(
    '/:id',
    async ({ params, body }) => {
      const program = MasterMarginService.updateMargin(params.id, body).pipe(
        Effect.as(status(200, { message: 'Success' })),
        Effect.catchTags({
          ItemNotFoundError: err =>
            Effect.succeed(
              status(404, {
                code: 'ITEM_NOT_FOUND_ERROR',
                message: `Margin dengan ID '${err.id}' tidak ditemukan`,
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal memperbarui margin',
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
      body: MasterMarginModel.updateMarginSchema,
      response: {
        200: SuccessSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )

  .delete(
    '/',
    async ({ body }) => {
      const program = MasterMarginService.deleteMargin(body.ids).pipe(
        Effect.as(status(200, { message: 'Success' })),
        Effect.catchTags({
          ItemsNotFoundError: err =>
            Effect.succeed(
              status(404, {
                code: 'ITEM_NOT_FOUND_ERROR',
                message: `Margin dengan ID '${err.ids.join(', ')}' tidak ditemukan`,
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal menghapus margin',
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
