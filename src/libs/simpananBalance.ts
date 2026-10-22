import { and, eq, ne, sql } from 'drizzle-orm'

import type { db } from '#/libs/database'

import { mutasiSimpanan, pemindahbukuan } from '#/libs/database/schema/simpanan'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

// Call after locking the source balance when reserving or spending funds.
export async function getPendingSimpanan(
  connection: typeof db | Transaction,
  userId: number,
  exclude: { mutasiId?: number; pemindahbukuanId?: number } = {},
) {
  const [[withdrawals], [transfers]] = await Promise.all([
    connection
      .select({
        total: sql`coalesce(sum(${mutasiSimpanan.nilaiTransaksi}), 0)`.mapWith(Number),
      })
      .from(mutasiSimpanan)
      .where(
        and(
          eq(mutasiSimpanan.userId, userId),
          eq(mutasiSimpanan.jenisSimpanan, 'tabungan'),
          eq(mutasiSimpanan.jenisTransaksi, 'penarikan'),
          eq(mutasiSimpanan.statusApproved, 'pending'),
          exclude.mutasiId === undefined ? undefined : ne(mutasiSimpanan.id, exclude.mutasiId),
        ),
      ),
    connection
      .select({
        tabungan:
          sql`coalesce(sum(case when ${pemindahbukuan.tipePemindahbukuan} <> 'saham_ke_saham' then ${pemindahbukuan.nominal} else 0 end), 0)`.mapWith(
            Number,
          ),
        saham:
          sql`coalesce(sum(case when ${pemindahbukuan.tipePemindahbukuan} = 'saham_ke_saham' then ${pemindahbukuan.jumlahSaham} else 0 end), 0)`.mapWith(
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
