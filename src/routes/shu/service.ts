import { and, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { shu } from '#/libs/database/schema/shu'
import { mutasiSimpanan, pemindahbukuan, saldoSimpanan } from '#/libs/database/schema/simpanan'
import { userProfile } from '#/libs/database/schema/users'
import { getJakartaDate } from '#/libs/date'
import { ForbiddenError } from '#/libs/errors'
import { allocateTransactionCode } from '#/libs/transaction'

import type * as ShuModel from './model'
import type { ShuMutation } from './utils'

import { assertAccounts, lockBalances } from '../pemindahbukuan/utils'
import { InvalidShuError, ShuAlreadyExistsError, ShuAlreadyTransferredError, ShuNotFoundError } from './errors'
import { allocateShu, calculateBobot, getLabaShu } from './utils'

export const ShuService = {
  async getShu(actor: { id: number; role?: string | null }, query: ShuModel.Get['Query']) {
    const userId = query.userId ?? actor.id
    if (userId !== actor.id && actor.role !== 'admin') {
      throw new ForbiddenError()
    }

    const condition = and(eq(shu.tahun, query.tahun), eq(shu.idUser, userId))
    const rows = await db
      .select({
        id: shu.id,
        tahun: shu.tahun,
        idUser: shu.idUser,
        nama: user.name,
        noAnggota: userProfile.noAnggota,
        jumlahShuSaham: shu.jumlahShuSaham,
        jumlahShuTabungan: shu.jumlahShuTabungan,
        dialihkanAt: shu.dialihkanAt,
      })
      .from(shu)
      .innerJoin(user, eq(user.id, shu.idUser))
      .leftJoin(userProfile, eq(userProfile.idUser, user.id))
      .where(condition)
      .orderBy(shu.idUser, shu.id)

    return {
      data: rows.map((row) => ({
        ...row,
        dialihkanAt: row.dialihkanAt?.toISOString() ?? null,
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

  async createShu(adminId: number, input: ShuModel.Post['Body']) {
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
        await assertAccounts(tx, [AkunId.LABARUGITAHUNBERJALAN, AkunId.PEMBAGIANSHU])

        const lastDate = `${String(tahun).padStart(4, '0')}-12-31`
        const end = sql`((${lastDate}::date + 1)::timestamp at time zone 'Asia/Jakarta')`
        // Include earlier approvals for the opening lots, but exclude next-year approvals.
        // Keep missing approval dates so calculation rejects corrupt history.
        const mutations = await tx
          .select()
          .from(mutasiSimpanan)
          .where(
            and(
              eq(mutasiSimpanan.statusApproved, 'approved'),
              or(isNull(mutasiSimpanan.approvedAt), lt(mutasiSimpanan.approvedAt, end)),
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

        const bobotSaham = calculateBobot(tahun, saham)
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

        const tanggalTransaksi = getJakartaDate()
        const kodeTransaksi = await allocateTransactionCode(tx, 'shu', tanggalTransaksi)
        const [createdJournal] = await tx
          .insert(jurnal)
          .values({ kodeTransaksi, tanggalTransaksi, keterangan: `Pembentukan SHU ${tahun}` })
          .returning({ id: jurnal.id })
        if (!createdJournal) throw new Error('Jurnal pembentukan SHU gagal dibuat')

        await tx.insert(jurnalDetail).values([
          {
            jurnalId: createdJournal.id,
            akunId: AkunId.PEMBAGIANSHU,
            userId: adminId,
            debit: totalShu,
            kredit: 0,
          },
          {
            jurnalId: createdJournal.id,
            akunId: AkunId.LABARUGITAHUNBERJALAN,
            userId: adminId,
            debit: 0,
            kredit: totalShu,
          },
        ])
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
      await assertAccounts(tx, [AkunId.PEMBAGIANSHU, AkunId.SIMPANANBERJANGKA])
      const balances = await lockBalances(
        tx,
        entries.map((entry) => entry.idUser),
      )
      const approvedAt = new Date()
      const tanggalTransaksi = getJakartaDate(approvedAt)

      // Every row is processed in this one transaction; a failure rolls back the entire year.
      for (const entry of entries) {
        const nominal = entry.jumlahShuSaham + entry.jumlahShuTabungan
        if (nominal === 0) {
          await tx.update(shu).set({ dialihkanAt: approvedAt }).where(eq(shu.id, entry.id))
          continue
        }

        const balance = balances.get(entry.idUser)!
        const saldoSetelahTransaksi = balance.saldoTabungan + nominal
        const kodeTransaksi = await allocateTransactionCode(tx, 'shu', tanggalTransaksi)
        const keterangan = `Pengalihan SHU ${input.tahun}`
        await tx.insert(mutasiSimpanan).values({
          kodeTransaksi,
          userId: entry.idUser,
          akunId: AkunId.PEMBAGIANSHU,
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
          .update(saldoSimpanan)
          .set({ saldoTabungan: saldoSetelahTransaksi })
          .where(eq(saldoSimpanan.userId, entry.idUser))

        const [createdJournal] = await tx
          .insert(jurnal)
          .values({ kodeTransaksi, tanggalTransaksi, keterangan })
          .returning({ id: jurnal.id })
        if (!createdJournal) throw new Error('Jurnal pengalihan SHU gagal dibuat')

        await tx.insert(jurnalDetail).values([
          {
            jurnalId: createdJournal.id,
            akunId: AkunId.SIMPANANBERJANGKA,
            userId: entry.idUser,
            debit: nominal,
            kredit: 0,
          },
          {
            jurnalId: createdJournal.id,
            akunId: AkunId.PEMBAGIANSHU,
            userId: entry.idUser,
            debit: 0,
            kredit: nominal,
          },
        ])
        await tx.update(shu).set({ dialihkanAt: approvedAt }).where(eq(shu.id, entry.id))
      }
    })
  },
}
