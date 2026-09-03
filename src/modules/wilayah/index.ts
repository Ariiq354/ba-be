import { Effect } from 'effect'
import Elysia, { status } from 'elysia'
import { ErrorSchema } from '#/utils/errors'
import { WilayahModel } from './model'
import { WilayahService } from './service'

export const WilayahModules = new Elysia({ prefix: 'wilayah', tags: ['Wilayah'] })
  .get(
    '/provinsi',
    async () => {
      const program = WilayahService.getProvinsi().pipe(
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil data provinsi',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      response: {
        200: WilayahModel.getProvinsiResponseSchema,
        500: ErrorSchema,
      },
    },
  )

  .get(
    '/kabupaten-kota',
    async ({ query }) => {
      const program = WilayahService.getKabupatenKota(query).pipe(
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil data kabupaten/kota',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      query: WilayahModel.getKabupatenKotaQuerySchema,
      response: {
        200: WilayahModel.getKabupatenKotaResponseSchema,
        500: ErrorSchema,
      },
    },
  )

  .get(
    '/kecamatan',
    async ({ query }) => {
      const program = WilayahService.getKecamatan(query).pipe(
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil data kecamatan',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      query: WilayahModel.getKecamatanQuerySchema,
      response: {
        200: WilayahModel.getKecamatanResponseSchema,
        500: ErrorSchema,
      },
    },
  )

  .get(
    '/desa-kelurahan',
    async ({ query }) => {
      const program = WilayahService.getDesaKelurahan(query).pipe(
        Effect.catchTags({
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mengambil data desa/kelurahan',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      query: WilayahModel.getDesaKelurahanQuerySchema,
      response: {
        200: WilayahModel.getDesaKelurahanResponseSchema,
        500: ErrorSchema,
      },
    },
  )
