import type { FilesModel } from './model'
import { and, eq, inArray, lte, sql } from 'drizzle-orm'
import { Effect, Result } from 'effect'
import { db } from '#/database'
import { files } from '#/database/schema/files'
import { DatabaseError, StorageError } from '#/utils/errors'
import { deleteFiles, generatePresignedUrl } from '#/utils/file'
import { PENDING_FILE_MAX_AGE_MS, PRESIGNED_URL_EXPIRY_SECONDS, UPLOAD_CONFIG } from './config'
import { FileTooLargeError, InvalidUploadDirectoryError, UnsupportedFileTypeError } from './errors'

const CLEANUP_LOCK_KEY = 'files:cleanup-pending'

export const FilesService = {
  generatePresignedUpload: Effect.fn('FilesService.generatePresignedUpload')(function* (
    input: FilesModel['presignedUploadSchema'],
  ) {
    const dirConfig = UPLOAD_CONFIG.get(input.dir)

    if (!dirConfig) {
      return yield* new InvalidUploadDirectoryError()
    }

    if (input.filesize > dirConfig.maxSize) {
      return yield* new FileTooLargeError({
        maxSizeMb: dirConfig.maxSize / 1024 / 1024,
      })
    }

    const extension = dirConfig.extensionByMimeType.get(input.fileType)
    if (!extension) {
      return yield* new UnsupportedFileTypeError()
    }

    const key = `${input.dir}/${crypto.randomUUID()}.${extension}`
    const uploadUrl = yield* generatePresignedUrl(key, {
      method: 'PUT',
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
      type: input.fileType,
    })

    yield* Effect.tryPromise({
      try: async () => {
        await db.insert(files).values({
          publicId: key,
          filename: input.filename,
          mimeType: input.fileType,
          size: input.filesize,
          status: 'pending',
        })
      },
      catch: error => new DatabaseError({ error }),
    })

    return { uploadUrl, key }
  }),

  cleanupPendingFiles: Effect.fn('FilesService.cleanupPendingFiles')(function* () {
    return yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [lock] = await tx.execute<{ acquired: boolean }>(sql`
            select pg_try_advisory_xact_lock(
              hashtextextended(${CLEANUP_LOCK_KEY}, 0)
            ) as acquired
          `)

          if (!lock?.acquired) {
            return { deletedCount: 0 }
          }

          const cutoff = new Date(Date.now() - PENDING_FILE_MAX_AGE_MS)

          const pendingFiles = await tx
            .select({
              publicId: files.publicId,
            })
            .from(files)
            .where(and(eq(files.status, 'pending'), lte(files.createdAt, cutoff)))
            .for('update')

          if (pendingFiles.length === 0) {
            return { deletedCount: 0 }
          }

          const publicIds = pendingFiles.map(file => file.publicId)

          const deleteResult = await Effect.runPromise(Effect.result(deleteFiles(publicIds)))

          if (Result.isFailure(deleteResult)) {
            throw deleteResult.failure
          }

          await tx.delete(files).where(inArray(files.publicId, publicIds))

          return {
            deletedCount: publicIds.length,
          }
        }),

      catch: (error) => {
        if (error instanceof StorageError) {
          return error
        }

        return new DatabaseError({
          error,
        })
      },
    })
  }),
}
