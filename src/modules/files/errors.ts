import { Data } from 'effect'

export class InvalidUploadDirectoryError extends Data.TaggedError('InvalidUploadDirectoryError') {}

export class FileTooLargeError extends Data.TaggedError('FileTooLargeError')<{
  readonly maxSizeMb: number
}> {}

export class UnsupportedFileTypeError extends Data.TaggedError('UnsupportedFileTypeError') {}
