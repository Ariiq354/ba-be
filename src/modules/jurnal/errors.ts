import { Data } from 'effect'

export class InvalidJurnalError extends Data.TaggedError('InvalidJurnalError')<{
  readonly reason: 'invalid_date' | 'invalid_details' | 'non_positive_totals'
}> {}

export class UnbalancedJurnalError extends Data.TaggedError('UnbalancedJurnalError')<{
  readonly totalDebit: number
  readonly totalKredit: number
}> {}

export class AccountsNotFoundError extends Data.TaggedError('AccountsNotFoundError')<{
  readonly ids: number[]
}> {}

export class InactiveAccountsError extends Data.TaggedError('InactiveAccountsError')<{
  readonly ids: number[]
}> {}

export class JurnalNotFoundError extends Data.TaggedError('JurnalNotFoundError')<{
  readonly id: number
}> {}

export class JurnalsNotFoundError extends Data.TaggedError('JurnalsNotFoundError')<{
  readonly ids: number[]
}> {}

export class InvalidJurnalIdsError extends Data.TaggedError('InvalidJurnalIdsError') {}

export class AutoJurnalsImmutableError extends Data.TaggedError('AutoJurnalsImmutableError')<{
  readonly ids: number[]
}> {}
