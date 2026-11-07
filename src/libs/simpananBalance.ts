import { and, eq, ne, sql } from 'drizzle-orm'

import type { db, Transaction } from '#/libs/database'

import { pemindahbukuan, simpananRiwayat } from '#/libs/database/schema/simpanan'

// Call after locking the source balance when reserving or spending funds.
export async function getPendingSimpanan(
  connection: typeof db | Transaction,
  userId: number,
  exclude: { mutasiId?: number; pemindahbukuanId?: number } = {},
) {
  const [[withdrawals], [transfers]] = await Promise.all([
    connection
      .select({
        total: sql`coalesce(sum(${simpananRiwayat.nilaiTransaksi}), 0)`.mapWith(Number),
      })
      .from(simpananRiwayat)
      .where(
        and(
          eq(simpananRiwayat.userId, userId),
          eq(simpananRiwayat.jenisSimpanan, 'tabungan'),
          eq(simpananRiwayat.jenisTransaksi, 'penarikan'),
          eq(simpananRiwayat.statusApproved, 'pending'),
          exclude.mutasiId === undefined ? undefined : ne(simpananRiwayat.id, exclude.mutasiId),
        ),
      ),
    connection
      .select({
        tabungan:
          sql`coalesce(sum(case when ${pemindahbukuan.tipePemindahbukuan} in ('tabungan_ke_tabungan', 'tabungan_ke_saham') then ${pemindahbukuan.nominal} else 0 end), 0)`.mapWith(
            Number,
          ),
        saham:
          sql`coalesce(sum(case when ${pemindahbukuan.tipePemindahbukuan} in ('saham_ke_saham', 'pembelian_kembali_saham') then ${pemindahbukuan.jumlahSaham} else 0 end), 0)`.mapWith(
            Number,
          ),
      })
      .from(pemindahbukuan)
      .where(
        and(
          eq(pemindahbukuan.idUserSumber, userId),
          eq(pemindahbukuan.statusApproved, 'pending'),
          exclude.pemindahbukuanId === undefined ? undefined : ne(pemindahbukuan.id, exclude.pemindahbukuanId),
        ),
      ),
  ])

  return {
    penarikan: withdrawals?.total ?? 0,
    pemindahbukuanTabungan: transfers?.tabungan ?? 0,
    pemindahbukuanSaham: transfers?.saham ?? 0,
  }
}
