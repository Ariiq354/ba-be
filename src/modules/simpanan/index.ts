import { Effect } from 'effect'
import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { simpananModel } from './model'
import { SimpananService } from './service'

export const SimpananModules = new Elysia({ prefix: 'simpanan', tags: ['Simpanan'] })
  .use(AuthMacro)
  .get(
    '/saldo',
    async ({ user }) => {
      const program = SimpananService.getSaldo(user.id).pipe(
        Effect.catchTags({
          NotMemberError: () =>
            Effect.succeed(
              status(400, {
                code: 'NOT_MEMBER_ERROR',
                message: 'Pengguna belum terdaftar sebagai anggota',
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil saldo simpanan',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      auth: true,
      response: {
        200: simpananModel.getSaldoResponseSchema,
        400: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .get(
    '/mutasi',
    async ({ user, query }) => {
      const program = SimpananService.getMutasi(user.id, user.role === 'admin', query).pipe(
        Effect.catchTags({
          NotMemberError: () =>
            Effect.succeed(
              status(400, {
                code: 'NOT_MEMBER_ERROR',
                message: 'Pengguna belum terdaftar sebagai anggota',
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil daftar mutasi simpanan',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      auth: true,
      query: simpananModel.getMutasiQuerySchema,
      response: {
        200: simpananModel.getMutasiResponseSchema,
        400: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .post(
    '/mutasi/setoran',
    async ({ user, body }) => {
      const program = SimpananService.createSetoran(user.id, body).pipe(
        Effect.as(status(201, { message: 'Success' })),
        Effect.catchTags({
          NotMemberError: () =>
            Effect.succeed(
              status(400, {
                code: 'NOT_MEMBER_ERROR',
                message: 'Pengguna belum terdaftar sebagai anggota',
              }),
            ),
          InvalidPaymentAccountError: () =>
            Effect.succeed(
              status(400, {
                code: 'INVALID_PAYMENT_ACCOUNT_ERROR',
                message: 'Akun pembayaran tidak valid',
              }),
            ),
          InvalidAccountError: () =>
            Effect.succeed(
              status(400, {
                code: 'INVALID_ACCOUNT_ERROR',
                message: 'Akun pembayaran tidak tersedia',
              }),
            ),
          AmountOverflowError: () =>
            Effect.succeed(
              status(400, {
                code: 'AMOUNT_OVERFLOW_ERROR',
                message: 'Nilai transaksi melebihi batas yang diizinkan',
              }),
            ),
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
                  message: 'Gagal membuat setoran simpanan',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      auth: true,
      body: simpananModel.createSetoranSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .post(
    '/mutasi/penarikan',
    async ({ user, body }) => {
      const program = SimpananService.createPenarikan(user.id, body).pipe(
        Effect.as(status(201, { message: 'Success' })),
        Effect.catchTags({
          NotMemberError: () =>
            Effect.succeed(
              status(400, {
                code: 'NOT_MEMBER_ERROR',
                message: 'Pengguna belum terdaftar sebagai anggota',
              }),
            ),
          InvalidPaymentAccountError: () =>
            Effect.succeed(
              status(400, {
                code: 'INVALID_PAYMENT_ACCOUNT_ERROR',
                message: 'Akun pembayaran tidak valid',
              }),
            ),
          InvalidAccountError: () =>
            Effect.succeed(
              status(400, {
                code: 'INVALID_ACCOUNT_ERROR',
                message: 'Akun pembayaran tidak tersedia',
              }),
            ),
          AmountOverflowError: () =>
            Effect.succeed(
              status(400, {
                code: 'AMOUNT_OVERFLOW_ERROR',
                message: 'Nilai transaksi melebihi batas yang diizinkan',
              }),
            ),
          InsufficientBalanceError: () =>
            Effect.succeed(
              status(400, {
                code: 'INSUFFICIENT_BALANCE_ERROR',
                message: 'Saldo efektif tidak mencukupi',
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal membuat penarikan simpanan',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      auth: true,
      body: simpananModel.createPenarikanSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .delete(
    '/mutasi',
    async ({ user, body }) => {
      const program = SimpananService.deleteMutasi(user.id, body.ids).pipe(
        Effect.as(status(200, { message: 'Success' })),
        Effect.catchTags({
          NotMemberError: () =>
            Effect.succeed(
              status(400, {
                code: 'NOT_MEMBER_ERROR',
                message: 'Pengguna belum terdaftar sebagai anggota',
              }),
            ),
          MutasiSimpananNotDeletedError: () =>
            Effect.succeed(
              status(404, {
                code: 'MUTASI_SIMPANAN_NOT_DELETED_ERROR',
                message: 'Mutasi simpanan pending tidak ditemukan',
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal menghapus mutasi simpanan',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      auth: true,
      body: simpananModel.deleteMutasiSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .patch(
    '/mutasi/:id/approve',
    async ({ user, params }) => {
      const program = SimpananService.approveMutasi(params.id, user.id).pipe(
        Effect.as(status(200, { message: 'Success' })),
        Effect.catchTags({
          MutasiSimpananNotFoundError: () =>
            Effect.succeed(
              status(404, {
                code: 'MUTASI_SIMPANAN_NOT_FOUND_ERROR',
                message: 'Mutasi simpanan tidak ditemukan',
              }),
            ),
          MutasiSimpananAlreadyProcessedError: () =>
            Effect.succeed(
              status(409, {
                code: 'MUTASI_SIMPANAN_ALREADY_PROCESSED_ERROR',
                message: 'Mutasi simpanan sudah diproses',
              }),
            ),
          InvalidAccountError: () =>
            Effect.succeed(
              status(400, {
                code: 'INVALID_ACCOUNT_ERROR',
                message: 'Akun jurnal yang diperlukan tidak tersedia',
              }),
            ),
          AmountOverflowError: () =>
            Effect.succeed(
              status(400, {
                code: 'AMOUNT_OVERFLOW_ERROR',
                message: 'Hasil transaksi melebihi batas yang diizinkan',
              }),
            ),
          InsufficientBalanceError: () =>
            Effect.succeed(
              status(400, {
                code: 'INSUFFICIENT_BALANCE_ERROR',
                message: 'Saldo efektif tidak mencukupi',
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal menyetujui mutasi simpanan',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      params: simpananModel.idParamsSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .patch(
    '/mutasi/:id/reject',
    async ({ user, params, body }) => {
      const program = SimpananService.rejectMutasi(
        params.id,
        user.id,
        body.alasanPenolakan,
      ).pipe(
        Effect.as(status(200, { message: 'Success' })),
        Effect.catchTags({
          InvalidRejectionReasonError: () =>
            Effect.succeed(
              status(400, {
                code: 'INVALID_REJECTION_REASON_ERROR',
                message: 'Alasan penolakan wajib diisi',
              }),
            ),
          MutasiSimpananNotFoundError: () =>
            Effect.succeed(
              status(404, {
                code: 'MUTASI_SIMPANAN_NOT_FOUND_ERROR',
                message: 'Mutasi simpanan tidak ditemukan',
              }),
            ),
          MutasiSimpananAlreadyProcessedError: () =>
            Effect.succeed(
              status(409, {
                code: 'MUTASI_SIMPANAN_ALREADY_PROCESSED_ERROR',
                message: 'Mutasi simpanan sudah diproses',
              }),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal menolak mutasi simpanan',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      admin: true,
      params: simpananModel.idParamsSchema,
      body: simpananModel.rejectMutasiSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
