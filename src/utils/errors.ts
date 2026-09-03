import { Data } from 'effect'
import { t } from 'elysia'

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  readonly error: unknown
}> {}

export class ItemNotFoundError extends Data.TaggedError('ItemNotFoundError')<{
  readonly id: number
}> {}

export class ItemsNotFoundError extends Data.TaggedError('ItemsNotFoundError')<{
  readonly ids: number[]
}> {}

export class StorageError extends Data.TaggedError('StorageError')<{
  readonly error: unknown
}> {}

export const ErrorSchema = t.Object({
  code: t.String(),
  message: t.String(),
})

export const SuccessSchema = t.Object({
  message: t.String(),
})
