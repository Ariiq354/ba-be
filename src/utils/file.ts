import type { S3FilePresignOptions } from 'bun'
import process from 'node:process'
import { S3Client } from 'bun'
import { Effect } from 'effect'
import { StorageError } from '#/utils/errors'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ID,
  bucket: process.env.CLOUDFLARE_BUCKET,
})

export const generatePresignedUrl = Effect.fn('generatePresignedUrl')(function* (
  path: string,
  options?: S3FilePresignOptions,
) {
  return yield* Effect.try({
    try: () => s3.presign(path, options),
    catch: error => new StorageError({ error }),
  })
})

export const deleteFiles = Effect.fn('deleteFiles')(function* (paths: string[]) {
  return yield* Effect.tryPromise({
    try: async () => {
      await Promise.all(paths.map(path => s3.delete(path)))
    },
    catch: error => new StorageError({ error }),
  })
})
