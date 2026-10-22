import { HTTPError } from 'elysia'

export class DuplicateKodeAkunError extends HTTPError.id('DUPLICATE_KODE_AKUN_ERROR', 409) {
  readonly kodeAkun: string

  constructor({ kodeAkun }: { kodeAkun: string }) {
    super(`Kode akun '${kodeAkun}' sudah digunakan`)
    this.kodeAkun = kodeAkun
  }
}
