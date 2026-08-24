import { t, type UnwrapSchema } from "elysia";

export const FilesModel = {
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
} as const;

export type FilesModel = {
  [key in keyof typeof FilesModel]: UnwrapSchema<(typeof FilesModel)[key]>;
};
