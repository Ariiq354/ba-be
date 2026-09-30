import { t } from 'elysia'

export interface AppErrorOptions {
  readonly code: string
  readonly message: string
  readonly status: number
}

export class AppError extends Error {
  readonly code: string
  readonly status: number

  constructor({ code, message, status }: AppErrorOptions) {
    super(message)
    this.name = new.target.name
    this.code = code
    this.status = status
  }

  toResponse() {
    return Response.json({
      code: this.code,
      message: this.message,
    }, {
      status: this.status,
    })
  }
}

export function logUnhandledError(error: unknown) {
  if (!(error instanceof AppError)) {
    console.error('Unhandled application error:', error)
  }
}

export class ItemNotFoundError extends AppError {
  readonly id: number

  constructor({ id, message = 'Data tidak ditemukan' }: { id: number, message?: string }) {
    super({
      code: 'ITEM_NOT_FOUND_ERROR',
      message,
      status: 404,
    })
    this.id = id
  }
}

export class ItemsNotFoundError extends AppError {
  readonly ids: number[]

  constructor({ ids, message = 'Data tidak ditemukan' }: { ids: number[], message?: string }) {
    super({
      code: 'ITEM_NOT_FOUND_ERROR',
      message,
      status: 404,
    })
    this.ids = ids
  }
}

export class PenggunaAccessDeniedError extends AppError {
  constructor() {
    super({
      code: 'PENGGUNA_ACCESS_DENIED_ERROR',
      message: 'Tidak memiliki akses ke pengguna tersebut',
      status: 403,
    })
  }
}

export const ErrorSchema = t.Object({
  code: t.String(),
  message: t.String(),
})

export const UnauthorizedSchema = t.Literal('Unauthorized')
export const ForbiddenSchema = t.Literal('Forbidden')

export const ValidationErrorSchema = t.Object({
  type: t.Literal('validation'),
  on: t.String(),
  property: t.Optional(t.String()),
  message: t.Optional(t.String()),
  summary: t.Optional(t.String()),
  expected: t.Optional(t.Unknown()),
  found: t.Optional(t.Unknown()),
  errors: t.Optional(t.Array(t.Unknown())),
})

export const SuccessSchema = t.Object({
  message: t.String(),
})
