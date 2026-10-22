import { HTTPError, t } from 'elysia'

export function logUnhandledError(error: unknown) {
  if (!(error instanceof HTTPError)) {
    console.error('Unhandled application error:', error)
  }
}

export class ItemNotFoundError extends HTTPError.id('ITEM_NOT_FOUND_ERROR', 404) {
  readonly id: number

  constructor({ id, message = 'Data tidak ditemukan' }: { id: number; message?: string }) {
    super(message)
    this.id = id
  }
}

export class ItemsNotFoundError extends HTTPError.id('ITEM_NOT_FOUND_ERROR', 404) {
  readonly ids: number[]

  constructor({ ids, message = 'Data tidak ditemukan' }: { ids: number[]; message?: string }) {
    super(message)
    this.ids = ids
  }
}

export class PenggunaAccessDeniedError extends HTTPError.id('PENGGUNA_ACCESS_DENIED_ERROR', 403) {
  constructor() {
    super('Tidak memiliki akses ke pengguna tersebut')
  }
}

export class UnauthorizedError extends HTTPError.id('UNAUTHORIZED', 401) {
  constructor() {
    super('Unauthorized')
  }
}

export class ForbiddenError extends HTTPError.id('FORBIDDEN', 403) {
  constructor() {
    super('Forbidden')
  }
}

export const ErrorSchema = t.Object({
  type: t.String(),
  code: t.String(),
  title: t.String(),
  status: t.Integer(),
  detail: t.Optional(t.String()),
  instance: t.Optional(t.String()),
})

export const UnauthorizedSchema = t.Object({
  ...ErrorSchema.properties,
  type: t.Literal('UNAUTHORIZED'),
  code: t.Literal('UNAUTHORIZED'),
  status: t.Literal(401),
})

export const ForbiddenSchema = t.Object({
  ...ErrorSchema.properties,
  type: t.Literal('FORBIDDEN'),
  code: t.Literal('FORBIDDEN'),
  status: t.Literal(403),
})

export const ValidationErrorSchema = t.Object({
  type: t.Literal('validation'),
  code: t.Literal('validation'),
  title: t.String(),
  status: t.Literal(422),
  detail: t.Optional(t.String()),
  on: t.String(),
  property: t.Optional(t.String()),
  expected: t.Optional(t.Unknown()),
  found: t.Optional(t.Unknown()),
  errors: t.Optional(t.Array(t.Unknown())),
})

export const SuccessSchema = t.Object({
  message: t.String(),
})
