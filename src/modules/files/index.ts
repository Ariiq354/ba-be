import { cron } from '@elysia/cron'
import Elysia, { status } from 'elysia'
import { auth } from '#/utils/auth'
import { ErrorSchema, logUnhandledError, UnauthorizedSchema } from '#/utils/errors'
import { filesModel } from './model'
import { FilesService } from './service'

export const FilesModules = new Elysia({ prefix: 'files', tags: ['Files'] })
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
      body: filesModel.presignedUploadSchema,
      async beforeHandle({ body, request: { headers } }) {
        if (body.dir === 'avatar') {
          return
        }

        const session = await auth.api.getSession({ headers })
        if (!session) {
          return status(401, 'Unauthorized')
        }
      },
      response: {
        201: filesModel.presignedUploadResponseSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
      },
    },
  )
