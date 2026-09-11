import { AppError } from '#/utils/errors'

export class HargaSahamNotFoundError extends AppError {
  constructor() {
    super({
      code: 'HARGA_SAHAM_NOT_FOUND_ERROR',
      message: 'Harga saham belum tersedia',
      status: 404,
    })
  }
}
