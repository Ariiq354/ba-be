import { AppError } from '#/utils/errors'

export class DuplicateKodeAkunError extends AppError {
  readonly kodeAkun: string

  constructor({ kodeAkun }: { kodeAkun: string }) {
    super({
      code: 'DUPLICATE_KODE_AKUN_ERROR',
      message: `Kode akun '${kodeAkun}' sudah digunakan`,
      status: 409,
    })
    this.kodeAkun = kodeAkun
  }
}
