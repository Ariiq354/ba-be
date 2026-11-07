import { HTTPError } from 'elysia'

export class InvalidAngsuranEksternalError extends HTTPError.id('INVALID_ANGSURAN_EKSTERNAL', 400) {}

export class AngsuranEksternalExceedsRemainingError extends HTTPError.id('ANGSURAN_EKSTERNAL_EXCEEDS_REMAINING', 409) {
  constructor() {
    super('Pembayaran pokok atau margin melebihi sisa pembiayaan eksternal')
  }
}
