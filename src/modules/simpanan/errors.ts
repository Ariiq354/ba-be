import { Data } from 'effect'

export class NotMemberError extends Data.TaggedError('NotMemberError')<{
  readonly userId: number
}> {}

export class InvalidPaymentAccountError extends Data.TaggedError(
  'InvalidPaymentAccountError',
)<{
    readonly akunId: number
  }> {}

export class InvalidAccountError extends Data.TaggedError('InvalidAccountError')<{
  readonly akunId: number
}> {}

export class AmountOverflowError extends Data.TaggedError('AmountOverflowError') {}

export class HargaSahamNotFoundError extends Data.TaggedError('HargaSahamNotFoundError') {}

export class InsufficientBalanceError extends Data.TaggedError('InsufficientBalanceError') {}

export class MutasiSimpananNotFoundError extends Data.TaggedError(
  'MutasiSimpananNotFoundError',
)<{
    readonly id: number
  }> {}

export class MutasiSimpananAlreadyProcessedError extends Data.TaggedError(
  'MutasiSimpananAlreadyProcessedError',
)<{
    readonly id: number
  }> {}

export class MutasiSimpananNotDeletedError extends Data.TaggedError(
  'MutasiSimpananNotDeletedError',
)<{
    readonly ids: number[]
  }> {}

export class InvalidRejectionReasonError extends Data.TaggedError(
  'InvalidRejectionReasonError',
) {}
