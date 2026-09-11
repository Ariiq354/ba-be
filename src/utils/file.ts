import type { S3FilePresignOptions } from 'bun'
import process from 'node:process'
import { S3Client } from 'bun'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ID,
  bucket: process.env.CLOUDFLARE_BUCKET,
})

export async function generatePresignedUrl(
  path: string,
  options?: S3FilePresignOptions,
): Promise<string> {
  return s3.presign(path, options)
}

export async function deleteFiles(paths: string[]) {
  await Promise.all(paths.map(path => s3.delete(path)))
}
