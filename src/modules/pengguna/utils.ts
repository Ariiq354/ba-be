import type { db } from '#/database'
import type { userProfile } from '#/database/schema/users'
import { eq } from 'drizzle-orm'
import { kecamatan, kelurahan, kota, provinsi } from '#/database/schema/wilayah'
import { InvalidProfileWilayahError } from './errors'

export type ProfileWilayah = Pick<typeof userProfile.$inferSelect, 'idProvinsi' | 'idKota' | 'idKecamatan' | 'idKelurahan'>
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function validateProfileWilayah(tx: Transaction, wilayah: ProfileWilayah) {
  let hierarchy: Partial<ProfileWilayah> | undefined

  if (wilayah.idKelurahan) {
    [hierarchy] = await tx
      .select({
        idProvinsi: kota.idProvinsi,
        idKota: kecamatan.idKota,
        idKecamatan: kelurahan.idKecamatan,
        idKelurahan: kelurahan.id,
      })
      .from(kelurahan)
      .innerJoin(kecamatan, eq(kecamatan.id, kelurahan.idKecamatan))
      .innerJoin(kota, eq(kota.id, kecamatan.idKota))
      .where(eq(kelurahan.id, wilayah.idKelurahan))
  }
  else if (wilayah.idKecamatan) {
    [hierarchy] = await tx
      .select({
        idProvinsi: kota.idProvinsi,
        idKota: kecamatan.idKota,
        idKecamatan: kecamatan.id,
      })
      .from(kecamatan)
      .innerJoin(kota, eq(kota.id, kecamatan.idKota))
      .where(eq(kecamatan.id, wilayah.idKecamatan))
  }
  else if (wilayah.idKota) {
    [hierarchy] = await tx
      .select({ idProvinsi: kota.idProvinsi, idKota: kota.id })
      .from(kota)
      .where(eq(kota.id, wilayah.idKota))
  }
  else if (wilayah.idProvinsi) {
    [hierarchy] = await tx
      .select({ idProvinsi: provinsi.id })
      .from(provinsi)
      .where(eq(provinsi.id, wilayah.idProvinsi))
  }
  else {
    return
  }

  const fields = ['idProvinsi', 'idKota', 'idKecamatan', 'idKelurahan'] as const
  if (!hierarchy || fields.some(field => wilayah[field] !== null && wilayah[field] !== hierarchy[field])) {
    throw new InvalidProfileWilayahError()
  }
}

export function getMembershipPeriod(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = String(date.getUTCFullYear()).slice(-2)
  return `${month}${year}`
}
