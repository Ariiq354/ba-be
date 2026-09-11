import { AppError } from '#/utils/errors'

export class InvalidUploadDirectoryError extends AppError {
  constructor() {
    super({
      code: 'INVALID_UPLOAD_DIRECTORY_ERROR',
      message: 'Direktori unggahan tidak valid',
      status: 400,
    })
  }
}

export class FileTooLargeError extends AppError {
  readonly maxSizeMb: number

  constructor({ maxSizeMb }: { maxSizeMb: number }) {
    super({
      code: 'FILE_TOO_LARGE_ERROR',
      message: `Ukuran file melebihi batas maksimum (${maxSizeMb}MB)`,
      status: 400,
    })
    this.maxSizeMb = maxSizeMb
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor() {
    super({
      code: 'UNSUPPORTED_FILE_TYPE_ERROR',
      message: 'Tipe file tidak didukung',
      status: 400,
    })
  }
}
