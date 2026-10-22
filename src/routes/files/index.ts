import { cron } from '@elysia/cron'
import Elysia, { HTTPError, status } from 'elysia'

import { auth } from '#/libs/auth'
import { logUnhandledError, UnauthorizedError } from '#/libs/errors'

import * as FilesModel from './model'
import { FilesService } from './service'

export const FilesRoutes = new Elysia({ prefix: 'files', tags: ['Files'] })
  .use(
    cron({
      name: 'cleanupPendingFiles',
      pattern: '0 0 17 * * *',
      timezone: 'UTC',
      protect: true,
      async run() {
        await FilesService.cleanupPendingFiles()
          .then(({ deletedCount }) => {
            // oxlint-disable-next-line no-console
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
    {
      body: FilesModel.PresignedPost.Body,
      async beforeHandle({ body, request: { headers } }) {
        if (body.dir === 'avatar') {
          return
        }

        const session = await auth.api.getSession({ headers })
        if (!session) {
          return new UnauthorizedError()
        }
      },
      response: FilesModel.PresignedPost.Response,
    },
    async ({ body }) => {
      const result = await FilesService.generatePresignedUpload(body)
      if (result instanceof HTTPError) return result
      return status(201, result)
    },
  )
