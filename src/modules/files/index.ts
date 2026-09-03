import { cron } from '@elysia/cron'
import { Effect } from 'effect'
import Elysia, { status } from 'elysia'
import { ErrorSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { FilesModel } from './model'
import { FilesService } from './service'

export const FilesModules = new Elysia({ prefix: 'files', tags: ['Files'] })
  .use(AuthMacro)
  .use(
    cron({
      name: 'cleanupPendingFiles',
      pattern: '0 0 17 * * *',
      timezone: 'UTC',
      protect: true,
      async run() {
        const program = FilesService.cleanupPendingFiles().pipe(
          Effect.tap(({ deletedCount }) =>
            Effect.logInfo(`Cleanup file pending selesai: ${deletedCount} file dihapus`),
          ),
          Effect.catchTags({
            StorageError: err => Effect.logError('Storage error saat cleanup file:', err.error),
            DatabaseError: err => Effect.logError('Database error saat cleanup file:', err.error),
          }),
        )

        await Effect.runPromise(program)
      },
    }),
  )
  .post(
    '/presigned',
    async ({ body }) => {
      const program = FilesService.generatePresignedUpload(body).pipe(
        Effect.map(result => status(201, result)),
        Effect.catchTags({
          InvalidUploadDirectoryError: () =>
            Effect.succeed(
              status(400, {
                code: 'INVALID_UPLOAD_DIRECTORY_ERROR',
                message: 'Direktori unggahan tidak valid',
              }),
            ),
          FileTooLargeError: err =>
            Effect.succeed(
              status(400, {
                code: 'FILE_TOO_LARGE_ERROR',
                message: `Ukuran file melebihi batas maksimum (${err.maxSizeMb}MB)`,
              }),
            ),
          UnsupportedFileTypeError: () =>
            Effect.succeed(
              status(400, {
                code: 'UNSUPPORTED_FILE_TYPE_ERROR',
                message: 'Tipe file tidak didukung',
              }),
            ),
          StorageError: err =>
            Effect.logError('Storage error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'STORAGE_ERROR',
                  message: 'Gagal membuat URL unggahan file',
                }),
              ),
            ),
          DatabaseError: err =>
            Effect.logError('Database error:', err.error).pipe(
              Effect.as(
                status(500, {
                  code: 'DATABASE_ERROR',
                  message: 'Gagal mencatat data file',
                }),
              ),
            ),
        }),
      )

      return Effect.runPromise(program)
    },
    {
      auth: true,
      body: FilesModel.presignedUploadSchema,
      response: {
        201: FilesModel.presignedUploadResponseSchema,
        400: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
