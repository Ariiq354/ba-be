export interface FileDirConfig {
  maxSize: number
  extensionByMimeType: Map<string, string>
}

export const UPLOAD_CONFIG = new Map<string, FileDirConfig>([
  [
    'avatar',
    {
      maxSize: 5 * 1024 * 1024,
      extensionByMimeType: new Map([
        ['image/jpeg', 'jpg'],
        ['image/jpg', 'jpg'],
        ['image/png', 'png'],
        ['image/webp', 'webp'],
      ]),
    },
  ],
])

export const PRESIGNED_URL_EXPIRY_SECONDS = 15 * 60
export const PENDING_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000
