import { cron } from '@elysia/cron'
import Elysia, { status } from 'elysia'
import { ErrorSchema, logUnhandledError } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { filesModel } from './model'
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
        await FilesService.cleanupPendingFiles()
          .then(({ deletedCount }) => {
            // eslint-disable-next-line no-console
            console.info(`Cleanup file pending selesai: ${deletedCount} file dihapus`)
          })
          .catch((error) => {
            logUnhandledError(error)
            throw error
          })
      },
    }),
  )
  .post(
    '/presigned',
    async ({ body }) => status(201, await FilesService.generatePresignedUpload(body)),
    {
      auth: true,
      body: filesModel.presignedUploadSchema,
      response: {
        201: filesModel.presignedUploadResponseSchema,
        400: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
