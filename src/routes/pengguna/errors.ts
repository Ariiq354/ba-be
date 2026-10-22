import { HTTPError } from 'elysia'

export class PenggunaAlreadyVerifiedError extends HTTPError.id('PENGGUNA_ALREADY_VERIFIED_ERROR', 409) {
  readonly penggunaId: number

  constructor({ penggunaId }: { penggunaId: number }) {
    super('Pengguna sudah terverifikasi sebelumnya')
    this.penggunaId = penggunaId
  }
}

export class PenggunaUnverifiedError extends HTTPError.id('PENGGUNA_UNVERIFIED_ERROR', 400) {
  readonly penggunaId: number

  constructor({ penggunaId }: { penggunaId: number }) {
    super('Pengguna belum terverifikasi dan tidak dapat dijadikan PJ Kelompok')
    this.penggunaId = penggunaId
  }
}

export class PenggunaBannedError extends HTTPError.id('PENGGUNA_BANNED_ERROR', 400) {
  readonly penggunaId: number

  constructor({ penggunaId }: { penggunaId: number }) {
    super('Pengguna yang sedang diblokir tidak dapat dijadikan PJ Kelompok')
    this.penggunaId = penggunaId
  }
}

export class AdminCannotBePjError extends HTTPError.id('ADMIN_CANNOT_BE_PJ_ERROR', 400) {
  readonly penggunaId: number

  constructor({ penggunaId }: { penggunaId: number }) {
    super('Pengguna dengan role admin tidak dapat dijadikan PJ Kelompok')
    this.penggunaId = penggunaId
  }
}

export class ProfileImageRequiredError extends HTTPError.id('PROFILE_IMAGE_REQUIRED_ERROR', 400) {
  constructor() {
    super('Foto profil baru wajib diisi untuk tindakan update')
  }
}

export class InvalidProfileImageError extends HTTPError.id('INVALID_PROFILE_IMAGE_ERROR', 400) {
  constructor() {
    super('File foto profil tidak valid atau sudah digunakan')
  }
}

export class InvalidProfileWilayahError extends HTTPError.id('INVALID_PROFILE_WILAYAH_ERROR', 400) {
  constructor() {
    super('Wilayah alamat tidak ditemukan atau tidak sesuai hierarki')
  }
}

export class KelompokNotFoundError extends HTTPError.id('KELOMPOK_NOT_FOUND_ERROR', 404) {
  readonly idKelompok: number

  constructor({ idKelompok }: { idKelompok: number }) {
    super('Kelompok pengguna tidak ditemukan')
    this.idKelompok = idKelompok
  }
}

export class DuplicateNikError extends HTTPError.id('DUPLICATE_NIK_ERROR', 409) {
  readonly nik: string

  constructor({ nik }: { nik: string }) {
    super(`NIK '${nik}' sudah digunakan`)
    this.nik = nik
  }
}
