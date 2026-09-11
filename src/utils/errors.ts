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

export const ErrorSchema = t.Object({
  code: t.String(),
  message: t.String(),
})

export const SuccessSchema = t.Object({
  message: t.String(),
})
