import { Effect } from 'effect'
import Elysia, { status } from 'elysia'
import { ErrorSchema } from '#/utils/errors'
import { kelompokModel } from './model'
import { KelompokService } from './service'

export const KelompokModules = new Elysia({ prefix: 'kelompok', tags: ['Kelompok'] }).get(
  '/options',
  async () => {
    const program = KelompokService.getKelompokOptions().pipe(
      Effect.catchTags({
        DatabaseError: err =>
          Effect.logError('Database error:', err.error).pipe(
            Effect.as(
              status(500, {
                code: 'DATABASE_ERROR',
                message: 'Gagal mengambil pilihan Kelompok',
              }),
            ),
          ),
      }),
    )

    return Effect.runPromise(program)
  },
  {
    response: {
      200: kelompokModel.getKelompokOptionsResponseSchema,
      500: ErrorSchema,
    },
  },
)
