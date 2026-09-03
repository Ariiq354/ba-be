import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'

export const filesModel = {
  presignedUploadSchema: t.Object({
    dir: t.String({ minLength: 1 }),
    filename: t.String({ minLength: 1 }),
    filesize: t.Integer({ minimum: 1 }),
    fileType: t.String({ minLength: 1 }),
  }),

  presignedUploadResponseSchema: t.Object({
    uploadUrl: t.String(),
    key: t.String(),
  }),
} as const

export type FilesModel = {
  [key in keyof typeof filesModel]: UnwrapSchema<(typeof filesModel)[key]>;
}
