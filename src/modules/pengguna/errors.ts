import { AppError } from '#/utils/errors'

export class PenggunaAlreadyVerifiedError extends AppError {
  readonly penggunaId: number

  constructor({ penggunaId }: { penggunaId: number }) {
    super({
      code: 'PENGGUNA_ALREADY_VERIFIED_ERROR',
      message: 'Pengguna sudah terverifikasi sebelumnya',
      status: 409,
    })
    this.penggunaId = penggunaId
  }
}

export class PenggunaNotPendingVerificationError extends AppError {
  readonly penggunaId: number

  constructor({ penggunaId }: { penggunaId: number }) {
    super({
      code: 'PENGGUNA_NOT_PENDING_VERIFICATION_ERROR',
      message: 'Pengguna sedang diblokir secara administratif',
      status: 409,
    })
    this.penggunaId = penggunaId
  }
}

export class PenggunaUnverifiedError extends AppError {
  readonly penggunaId: number

  constructor({ penggunaId }: { penggunaId: number }) {
    super({
      code: 'PENGGUNA_UNVERIFIED_ERROR',
      message: 'Pengguna belum terverifikasi dan tidak dapat dijadikan PJ Kelompok',
      status: 400,
    })
    this.penggunaId = penggunaId
  }
}

export class PenggunaBannedError extends AppError {
  readonly penggunaId: number

  constructor({ penggunaId }: { penggunaId: number }) {
    super({
      code: 'PENGGUNA_BANNED_ERROR',
      message: 'Pengguna yang sedang diblokir tidak dapat dijadikan PJ Kelompok',
      status: 400,
    })
    this.penggunaId = penggunaId
  }
}

export class AdminCannotBePjError extends AppError {
  readonly penggunaId: number

  constructor({ penggunaId }: { penggunaId: number }) {
    super({
      code: 'ADMIN_CANNOT_BE_PJ_ERROR',
      message: 'Pengguna dengan role admin tidak dapat dijadikan PJ Kelompok',
      status: 400,
    })
    this.penggunaId = penggunaId
  }
}

export class ProfileImageRequiredError extends AppError {
  constructor() {
    super({
      code: 'PROFILE_IMAGE_REQUIRED_ERROR',
      message: 'Foto profil baru wajib diisi untuk tindakan update',
      status: 400,
    })
  }
}

export class InvalidProfileImageError extends AppError {
  constructor() {
    super({
      code: 'INVALID_PROFILE_IMAGE_ERROR',
      message: 'File foto profil tidak valid atau sudah digunakan',
      status: 400,
    })
  }
}

export class KelompokNotFoundError extends AppError {
  readonly idKelompok: number

  constructor({ idKelompok }: { idKelompok: number }) {
    super({
      code: 'KELOMPOK_NOT_FOUND_ERROR',
      message: 'Kelompok pengguna tidak ditemukan',
      status: 404,
    })
    this.idKelompok = idKelompok
  }
}

export class DuplicateNikError extends AppError {
  readonly nik: string

  constructor({ nik }: { nik: string }) {
    super({
      code: 'DUPLICATE_NIK_ERROR',
      message: `NIK '${nik}' sudah digunakan`,
      status: 409,
    })
    this.nik = nik
  }
}
