import { and, asc, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { shu } from '#/libs/database/schema/shu'
import { pemindahbukuan, simpananRiwayat, simpananSaldo } from '#/libs/database/schema/simpanan'
import { userProfile } from '#/libs/database/schema/users'
import { getJakartaDate } from '#/libs/date'
import { ForbiddenError } from '#/libs/errors'
import { allocateTransactionCode } from '#/libs/transaction'

import type * as ShuModel from './model'
import type { ShuMutation } from './utils'

import { lockBalances } from '../pemindahbukuan/utils'
import { assertActiveAccounts } from '../simpanan/utils'
import { InvalidShuError, ShuAlreadyExistsError, ShuAlreadyTransferredError, ShuNotFoundError } from './errors'
import { allocateShu, calculateBobot, getLabaShu } from './utils'

export const ShuService = {
  async getMonitoring(query: ShuModel.MonitoringGet['Query']) {
    const rows = await db
      .select({
        nama: user.name,
        noAnggota: userProfile.noAnggota,
        jumlahShuSaham: shu.jumlahShuSaham,
        jumlahShuTabungan: shu.jumlahShuTabungan,
      })
      .from(user)
      .leftJoin(userProfile, eq(userProfile.idUser, user.id))
      .leftJoin(shu, and(eq(shu.idUser, user.id), eq(shu.tahun, query.tahun)))
      .where(query.idKelompok === undefined ? undefined : eq(user.idKelompok, query.idKelompok))
      .orderBy(asc(user.name), asc(user.id), asc(shu.id))

    return {
      data: rows.map((row) => ({
        ...row,
        jumlahShuSaham: row.jumlahShuSaham ?? 0,
        jumlahShuTabungan: row.jumlahShuTabungan ?? 0,
        totalShu: (row.jumlahShuSaham ?? 0) + (row.jumlahShuTabungan ?? 0),
      })),
    } satisfies ShuModel.MonitoringGet['Response'][200]
  },

  async getShu(actor: { id: number; role?: string | null }, query: ShuModel.Get['Query']) {
    const userId = query.userId ?? actor.id
    if (userId !== actor.id && actor.role !== 'admin') {
      throw new ForbiddenError()
    }

    const condition = and(eq(shu.tahun, query.tahun), eq(shu.idUser, userId))
    const rows = await db
      .select({
        tahun: shu.tahun,
        jumlahShuSaham: shu.jumlahShuSaham,
        jumlahShuTabungan: shu.jumlahShuTabungan,
      })
      .from(shu)
      .where(condition)
      .orderBy(shu.idUser, shu.id)

    return {
      data: rows.map((row) => ({
        ...row,
        totalShu: row.jumlahShuSaham + row.jumlahShuTabungan,
      })),
    } satisfies ShuModel.Get['Response'][200]
  },

  async getReferensi(query: ShuModel.ReferensiGet['Query']) {
    const laba = await getLabaShu(db, query.tahun)
    const existing = await db.$count(shu, eq(shu.tahun, query.tahun))
    const transferred = await db.$count(shu, and(eq(shu.tahun, query.tahun), isNotNull(shu.dialihkanAt)))
    return {
      tahun: query.tahun,
      laba,
      batasShu: Math.max(0, laba),
      sudahDibagikan: existing > 0,
      sudahDialihkan: existing > 0 && transferred === existing,
    } satisfies ShuModel.ReferensiGet['Response'][200]
  },

  async createShu(input: ShuModel.Post['Body']) {
    await db.transaction(
      async (tx) => {
        // Lock before taking the repeatable-read snapshot, so concurrent saves see
        // the previous save and cannot distribute the same year's profit twice.
        await tx.execute(sql`lock table ${shu} in share row exclusive mode`)
        const existing = await tx.$count(shu, eq(shu.tahun, input.tahun))
        if (existing > 0) throw new ShuAlreadyExistsError()

        const { tahun, totalShu } = input
        const laba = await getLabaShu(tx, tahun)
        if (totalShu > laba) {
          throw new InvalidShuError('Total SHU tidak boleh melebihi laba tahun yang dipilih')
        }
        const lastDate = `${String(tahun).padStart(4, '0')}-12-31`
        const end = sql`((${lastDate}::date + 1)::timestamp at time zone 'Asia/Jakarta')`
        // Include earlier approvals for the opening lots, but exclude next-year approvals.
        // Keep missing approval dates so calculation rejects corrupt history.
        const mutations = await tx
          .select()
          .from(simpananRiwayat)
          .where(
            and(
              eq(simpananRiwayat.statusApproved, 'approved'),
              or(isNull(simpananRiwayat.approvedAt), lt(simpananRiwayat.approvedAt, end)),
            ),
          )
        const transfers = await tx
          .select()
          .from(pemindahbukuan)
          .where(
            and(
              eq(pemindahbukuan.statusApproved, 'approved'),
              or(isNull(pemindahbukuan.approvedAt), lt(pemindahbukuan.approvedAt, end)),
            ),
          )
        const saham: ShuMutation[] = []
        const tabungan: ShuMutation[] = []

        for (const mutation of mutations) {
          const amount = mutation.jenisSimpanan === 'saham' ? mutation.jumlahSaham : mutation.nilaiTransaksi
          const target = mutation.jenisSimpanan === 'saham' ? saham : tabungan
          target.push({
            idUser: mutation.userId,
            approvedAt: mutation.approvedAt,
            kodeTransaksi: mutation.kodeTransaksi,
            jumlah: mutation.jenisTransaksi === 'setoran' ? amount : -amount,
          })
        }

        for (const transfer of transfers) {
          if (transfer.tipePemindahbukuan === 'pembelian_kembali_saham') {
            saham.push({
              idUser: transfer.idUserSumber,
              approvedAt: transfer.approvedAt,
              kodeTransaksi: transfer.kodeTransaksi,
              jumlah: -transfer.jumlahSaham,
            })
            continue
          }
          if (transfer.idUserTujuan === null) {
            throw new InvalidShuError(`Anggota tujuan pemindahbukuan ${transfer.kodeTransaksi} tidak tersedia`)
          }
          const source = transfer.tipePemindahbukuan === 'saham_ke_saham' ? saham : tabungan
          const destination = transfer.tipePemindahbukuan === 'tabungan_ke_tabungan' ? tabungan : saham
          source.push({
            idUser: transfer.idUserSumber,
            approvedAt: transfer.approvedAt,
            kodeTransaksi: transfer.kodeTransaksi,
            jumlah: -(transfer.tipePemindahbukuan === 'saham_ke_saham' ? transfer.jumlahSaham : transfer.nominal),
          })
          destination.push({
            idUser: transfer.idUserTujuan,
            approvedAt: transfer.approvedAt,
            kodeTransaksi: transfer.kodeTransaksi,
            jumlah: transfer.tipePemindahbukuan === 'tabungan_ke_tabungan' ? transfer.nominal : transfer.jumlahSaham,
          })
        }

        // Use half-share units so legacy fractions remain exact in BigInt calculations.
        const bobotSaham = calculateBobot(tahun, saham, 2)
        const bobotTabungan = calculateBobot(tahun, tabungan)
        const alokasiSaham = Number((BigInt(totalShu) * 60n) / 100n)
        const alokasiTabungan = totalShu - alokasiSaham
        const shuSaham = allocateShu(alokasiSaham, bobotSaham)
        const shuTabungan = allocateShu(alokasiTabungan, bobotTabungan)
        const ids = [...new Set([...bobotSaham.keys(), ...bobotTabungan.keys()])].filter(
          (id) => (bobotSaham.get(id) ?? 0n) > 0n || (bobotTabungan.get(id) ?? 0n) > 0n,
        )
        const rows = ids.map((idUser) => ({
          tahun,
          idUser,
          jumlahShuSaham: shuSaham.get(idUser) ?? 0,
          jumlahShuTabungan: shuTabungan.get(idUser) ?? 0,
        }))
        for (let offset = 0; offset < rows.length; offset += 1000) {
          await tx.insert(shu).values(rows.slice(offset, offset + 1000))
        }
      },
      { isolationLevel: 'repeatable read' },
    )
  },

  async alihkanShu(adminId: number, input: ShuModel.PengalihanPost['Body']) {
    await db.transaction(async (tx) => {
      const entries = await tx
        .select()
        .from(shu)
        .where(eq(shu.tahun, input.tahun))
        .orderBy(shu.idUser, shu.id)
        .for('update')

      if (entries.length === 0) throw new ShuNotFoundError()
      if (entries.some((entry) => entry.dialihkanAt !== null)) {
        throw new ShuAlreadyTransferredError()
      }
      if (new Set(entries.map((entry) => entry.idUser)).size !== entries.length) {
        throw new InvalidShuError('Data SHU berisi duplikasi anggota untuk tahun yang dipilih')
      }
      const totalShu = entries.reduce((total, entry) => total + entry.jumlahShuSaham + entry.jumlahShuTabungan, 0)
      if (totalShu <= 0) {
        throw new InvalidShuError('Total SHU harus lebih besar dari nol')
      }
      await assertActiveAccounts(tx, [AkunId.LABARUGITAHUNBERJALAN, AkunId.SIMPANANBERJANGKA])
      const balances = await lockBalances(
        tx,
        entries.map((entry) => entry.idUser),
      )
      const approvedAt = new Date()
      const tanggalTransaksi = getJakartaDate(approvedAt)
      const kodeTransaksi = await allocateTransactionCode(tx, 'shu', tanggalTransaksi)
      const keterangan = `Pengalihan SHU ${input.tahun}`
      const [createdJournal] = await tx
        .insert(jurnal)
        .values({ kodeTransaksi, tanggalTransaksi, keterangan })
        .returning({ id: jurnal.id })
      if (!createdJournal) throw new Error('Jurnal pengalihan SHU gagal dibuat')

      const details: Array<typeof jurnalDetail.$inferInsert> = [
        {
          jurnalId: createdJournal.id,
          akunId: AkunId.LABARUGITAHUNBERJALAN,
          userId: adminId,
          debit: totalShu,
          kredit: 0,
        },
      ]

      // Every row is processed in this one transaction; a failure rolls back the entire year.
      for (const entry of entries) {
        const nominal = entry.jumlahShuSaham + entry.jumlahShuTabungan
        if (nominal === 0) {
          await tx.update(shu).set({ dialihkanAt: approvedAt }).where(eq(shu.id, entry.id))
          continue
        }

        const balance = balances.get(entry.idUser)!
        const saldoSetelahTransaksi = balance.saldoTabungan + nominal
        const kodeMutasi = await allocateTransactionCode(tx, 'simpanan', tanggalTransaksi)
        await tx.insert(simpananRiwayat).values({
          kodeTransaksi: kodeMutasi,
          userId: entry.idUser,
          akunId: AkunId.LABARUGITAHUNBERJALAN,
          jenisTransaksi: 'setoran',
          jenisSimpanan: 'tabungan',
          nilaiTransaksi: nominal,
          saldoSetelahTransaksi,
          tanggalTransaksi,
          statusApproved: 'approved',
          createdBy: adminId,
          approvedBy: adminId,
          approvedAt,
          keterangan,
        })

        await tx
          .update(simpananSaldo)
          .set({ saldoTabungan: saldoSetelahTransaksi })
          .where(eq(simpananSaldo.userId, entry.idUser))

        details.push({
          jurnalId: createdJournal.id,
          akunId: AkunId.SIMPANANBERJANGKA,
          userId: entry.idUser,
          debit: 0,
          kredit: nominal,
        })
        await tx.update(shu).set({ dialihkanAt: approvedAt }).where(eq(shu.id, entry.id))
      }

      for (let offset = 0; offset < details.length; offset += 1000) {
        await tx.insert(jurnalDetail).values(details.slice(offset, offset + 1000))
      }
    })
  },
}
