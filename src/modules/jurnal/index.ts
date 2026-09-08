import { Effect } from 'effect'
import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { jurnalModel } from './model'
import { JurnalService } from './service'

export const JurnalModules = new Elysia({ prefix: 'jurnal', tags: ['Jurnal'] })
  .use(AuthMacro)
  .get(
    '/',
    async ({ query }) => {
      const program = JurnalService.getPaginatedJurnal(query).pipe(
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil data jurnal',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      query: jurnalModel.getJurnalQuerySchema,
      response: {
        200: jurnalModel.getJurnalResponseSchema,
        500: ErrorSchema,
      },
    },
  )

  .get(
    '/:id',
    async ({ params }) => {
      const program = JurnalService.getJurnalById(params.id).pipe(
        Effect.catchTags({
          JurnalNotFoundError: err =>
            Effect.succeed(
              status(404, {
                code: 'JURNAL_NOT_FOUND_ERROR',
                message: `Jurnal dengan ID '${err.id}' tidak ditemukan`,
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil data jurnal',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      params: jurnalModel.getJurnalByIdParamsSchema,
      response: {
        200: jurnalModel.getJurnalByIdResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )

  .post(
    '/',
    async ({ body, user }) => {
      const program = JurnalService.createJurnal(user.id, body).pipe(
        Effect.as(status(201, { message: 'Success' })),
        Effect.catchTags({
          InvalidJurnalError: err =>
            Effect.succeed(
              status(400, {
                code: 'INVALID_JURNAL_ERROR',
                message: err.reason === 'invalid_date'
                  ? 'Format tanggal transaksi tidak valid'
                  : err.reason === 'non_positive_totals'
                    ? 'Total debit dan kredit harus lebih dari 0'
                    : 'Detail jurnal tidak valid',
              }),
            ),
          UnbalancedJurnalError: err =>
            Effect.succeed(
              status(400, {
                code: 'UNBALANCED_JURNAL_ERROR',
                message: `Total debit (${err.totalDebit}) harus sama dengan total kredit (${err.totalKredit})`,
              }),
            ),
          InactiveAccountsError: err =>
            Effect.succeed(
              status(400, {
                code: 'INACTIVE_ACCOUNT_ERROR',
                message: `Akun dengan ID '${err.ids.join(', ')}' tidak aktif`,
              }),
            ),
          AccountsNotFoundError: err =>
            Effect.succeed(
              status(404, {
                code: 'ACCOUNT_NOT_FOUND_ERROR',
                message: `Akun dengan ID '${err.ids.join(', ')}' tidak ditemukan`,
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal membuat jurnal',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      body: jurnalModel.createJurnalSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )

  .delete(
    '/',
    async ({ body }) => {
      const program = JurnalService.deleteJurnal(body.ids).pipe(
        Effect.as(status(200, { message: 'Success' })),
        Effect.catchTags({
          InvalidJurnalIdsError: () =>
            Effect.succeed(
              status(400, {
                code: 'INVALID_JURNAL_ERROR',
                message: 'Minimal satu ID jurnal harus diberikan',
              }),
            ),
          JurnalsNotFoundError: err =>
            Effect.succeed(
              status(404, {
                code: 'JURNAL_NOT_FOUND_ERROR',
                message: `Jurnal dengan ID '${err.ids.join(', ')}' tidak ditemukan`,
              }),
            ),
          AutoJurnalsImmutableError: err =>
            Effect.succeed(
              status(409, {
                code: 'AUTO_JURNAL_IMMUTABLE_ERROR',
                message: `Jurnal otomatis dengan ID '${err.ids.join(', ')}' tidak dapat dihapus`,
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal menghapus jurnal',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      body: jurnalModel.deleteJurnalSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
