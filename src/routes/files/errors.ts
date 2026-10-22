import { HTTPError } from 'elysia'

export class InvalidUploadDirectoryError extends HTTPError.id('INVALID_UPLOAD_DIRECTORY_ERROR', 400) {
  constructor() {
    super('Direktori unggahan tidak valid')
  }
}

export class FileTooLargeError extends HTTPError.id('FILE_TOO_LARGE_ERROR', 400) {
  readonly maxSizeMb: number

  constructor({ maxSizeMb }: { maxSizeMb: number }) {
    super(`Ukuran file melebihi batas maksimum (${maxSizeMb}MB)`)
    this.maxSizeMb = maxSizeMb
  }
}

export class UnsupportedFileTypeError extends HTTPError.id('UNSUPPORTED_FILE_TYPE_ERROR', 400) {
  constructor() {
    super('Tipe file tidak didukung')
  }
}
