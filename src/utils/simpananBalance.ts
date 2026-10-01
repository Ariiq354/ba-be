import type { db } from '#/database'
import { and, eq, ne, sql } from 'drizzle-orm'
import { mutasiSimpanan, pemindahbukuan } from '#/database/schema/simpanan'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

// Call after locking the source balance when reserving or spending funds.
export async function getPendingSimpanan(
  connection: typeof db | Transaction,
  userId: number,
  exclude: { mutasiId?: number, pemindahbukuanId?: number } = {},
) {
  const [[withdrawals], [transfers]] = await Promise.all([
    connection
      .select({
        total: sql<string>`coalesce(sum(${mutasiSimpanan.nilaiTransaksi}), 0)::text`,
      })
      .from(mutasiSimpanan)
      .where(and(
        eq(mutasiSimpanan.userId, userId),
        eq(mutasiSimpanan.jenisSimpanan, 'tabungan'),
        eq(mutasiSimpanan.jenisTransaksi, 'penarikan'),
        eq(mutasiSimpanan.statusApproved, 'pending'),
        exclude.mutasiId === undefined ? undefined : ne(mutasiSimpanan.id, exclude.mutasiId),
      )),
    connection
      .select({
        tabungan: sql<string>`coalesce(sum(case when ${pemindahbukuan.tipePemindahbukuan} <> 'saham_ke_saham' then ${pemindahbukuan.nominal} else 0 end), 0)::text`,
        saham: sql<string>`coalesce(sum(case when ${pemindahbukuan.tipePemindahbukuan} = 'saham_ke_saham' then ${pemindahbukuan.jumlahSaham} else 0 end), 0)::text`,
      })
      .from(pemindahbukuan)
      .where(and(
        eq(pemindahbukuan.idUserSumber, userId),
        eq(pemindahbukuan.statusApproved, 'pending'),
        exclude.pemindahbukuanId === undefined ? undefined : ne(pemindahbukuan.id, exclude.pemindahbukuanId),
      )),
  ])

  return {
    penarikan: BigInt(withdrawals?.total ?? '0'),
    pemindahbukuanTabungan: BigInt(transfers?.tabungan ?? '0'),
    pemindahbukuanSaham: BigInt(transfers?.saham ?? '0'),
  }
}
