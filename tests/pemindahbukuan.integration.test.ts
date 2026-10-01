import process from 'node:process'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api-postgres'
import { eq, sql } from 'drizzle-orm'
import postgres from 'postgres'
import * as akunSchema from '#/database/schema/akun'
import * as authSchema from '#/database/schema/auth'
import * as jurnalSchema from '#/database/schema/jurnal'
import * as kelompokSchema from '#/database/schema/kelompok'
import * as masterSchema from '#/database/schema/master'
import * as simpananSchema from '#/database/schema/simpanan'
import * as transactionSchema from '#/database/schema/transaction'
import * as usersSchema from '#/database/schema/users'
import * as wilayahSchema from '#/database/schema/wilayah'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const { pemindahbukuan, saldoSimpanan, mutasiSimpanan } = simpananSchema
const { jurnal, jurnalDetail } = jurnalSchema
const query = { page: 1, limit: 100, search: '', status: 'all', tipePemindahbukuan: 'all' } as const

describe.skipIf(!testDatabaseUrl)('pemindahbukuan with PostgreSQL', () => {
  let db: typeof import('#/database')['db']
  let transfers: typeof import('#/modules/pemindahbukuan/service')['PemindahbukuanService']
  let savings: typeof import('#/modules/simpanan/service')['SimpananService']
  let journals: typeof import('#/modules/jurnal/service')['JurnalService']
  let api: typeof import('#/modules')['Modules']
  let admin: ReturnType<typeof postgres>
  const schemaName = `test_pbk_${crypto.randomUUID().replaceAll('-', '')}`
  const originalDatabaseUrl = process.env.DATABASE_URL

  beforeAll(async () => {
    admin = postgres(testDatabaseUrl!, { max: 1, onnotice: () => {} })
    await admin.unsafe(`CREATE SCHEMA "${schemaName}"`)
    await admin.unsafe(`SET search_path TO "${schemaName}"`)

    // Generate fixtures from the real schema, inside a disposable namespace.
    const empty = await generateDrizzleJson({})
    const snapshot = await generateDrizzleJson({
      ...akunSchema,
      ...authSchema,
      ...jurnalSchema,
      ...kelompokSchema,
      ...masterSchema,
      ...simpananSchema,
      ...transactionSchema,
      ...usersSchema,
      ...wilayahSchema,
    })
    for (const statement of await generateMigration(empty, snapshot)) {
      await admin.unsafe(statement.replaceAll('"public".', `"${schemaName}".`))
    }

    const url = new URL(testDatabaseUrl!)
    url.searchParams.set('search_path', schemaName)
    url.searchParams.set('client_min_messages', 'warning')
    process.env.DATABASE_URL = url.toString()
    ;({ db } = await import('#/database'))
    ;({ PemindahbukuanService: transfers } = await import('#/modules/pemindahbukuan/service'))
    ;({ SimpananService: savings } = await import('#/modules/simpanan/service'))
    ;({ JurnalService: journals } = await import('#/modules/jurnal/service'))
    const { Modules } = await import('#/modules')
    api = Modules.compile()
  }, 30_000)

  afterAll(async () => {
    if (db) {
      await db.$client.end()
    }
    if (admin) {
      await admin.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
      await admin.end()
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    }
    else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
  })

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE "user", kelompok, akun, jurnal, transaction_code_counter RESTART IDENTITY CASCADE`)
    await db.insert(kelompokSchema.kelompok).values([
      { id: 1, kodeKelompok: 'A', namaKelompok: 'Kelompok A' },
      { id: 2, kodeKelompok: 'B', namaKelompok: 'Kelompok B' },
    ])
    await db.insert(authSchema.user).values([
      { id: 1, name: 'Admin', email: 'admin@test.invalid', emailVerified: true, role: 'admin', idKelompok: 1 },
      { id: 2, name: 'Sumber', email: 'sumber@test.invalid', emailVerified: true, role: 'user', idKelompok: 1 },
      { id: 3, name: 'Tujuan', email: 'tujuan@test.invalid', emailVerified: true, role: 'user', idKelompok: 2 },
      { id: 4, name: 'PJ', email: 'pj@test.invalid', emailVerified: true, role: 'pj', idKelompok: 1 },
      { id: 5, name: 'Lain', email: 'lain@test.invalid', emailVerified: true, role: 'user', idKelompok: 2 },
      { id: 6, name: 'Nonanggota', email: 'nonanggota@test.invalid', emailVerified: true, role: 'user', idKelompok: 2 },
    ])
    await db.insert(usersSchema.userProfile).values([
      { idUser: 2, noAnggota: 'A002' },
      { idUser: 3, noAnggota: 'A003' },
      { idUser: 4, noAnggota: 'A004' },
      { idUser: 5, noAnggota: 'A005' },
      { idUser: 6, noAnggota: ' ' },
    ])
    await db.insert(kelompokSchema.kelompokPenanggungJawab).values({ kelompokId: 1, userId: 4 })
    await db.insert(akunSchema.akun).values([
      { id: 1, kodeAkun: 'KAS', namaAkun: 'Kas', kategori: 'aktiva', normalBalance: 'debit' },
      { id: 12, kodeAkun: 'TAB', namaAkun: 'Tabungan', kategori: 'pasiva', normalBalance: 'kredit' },
      { id: 19, kodeAkun: 'SHM', namaAkun: 'Saham', kategori: 'pasiva', normalBalance: 'kredit' },
      { id: 50, kodeAkun: 'AGIO', namaAkun: 'Agio', kategori: 'pasiva', normalBalance: 'kredit' },
    ])
    await db.insert(masterSchema.saham).values({ hargaNominal: 50_000, hargaJual: 60_000, updatedBy: 1 })
    await db.insert(saldoSimpanan).values([
      { userId: 2, saldoTabungan: 1_000_000, jumlahSaham: 10 },
      { userId: 3, saldoTabungan: 200_000, jumlahSaham: 2 },
    ])
  })

  async function propose(nominal = 100_000, source = 2, destination = 3, actor = source) {
    await transfers.createPemindahbukuan(actor, {
      idUserSumber: source,
      idUserTujuan: destination,
      tipePemindahbukuan: 'tabungan_ke_tabungan',
      nominal,
    })
    const list = await transfers.getPemindahbukuan(1, query)
    return list.data[0]
  }

  async function balance(userId: number) {
    const [row] = await db.select().from(saldoSimpanan).where(eq(saldoSimpanan.userId, userId))
    return row
  }

  async function login(userId: number, email: string) {
    const { hashPassword } = await import('better-auth/crypto')
    const { auth } = await import('#/utils/auth')
    const password = 'pemindahbukuan-test-password'
    await db.insert(authSchema.account).values({
      accountId: String(userId),
      userId,
      providerId: 'credential',
      password: await hashPassword(password),
    })
    const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true })
    expect(response.status).toBe(200)
    return response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ')
  }

  async function request(path: string, method = 'GET', cookie = '', body?: unknown) {
    return api.handle(new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: { cookie, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }))
  }

  test('HTTP routes validate input, authenticate, enforce admin approval, and serialize the list', async () => {
    expect((await request('/pemindahbukuan')).status).toBe(401)
    const memberCookie = await login(2, 'sumber@test.invalid')
    const adminCookie = await login(1, 'admin@test.invalid')
    for (const nominal of [0, 1.5, 2_147_483_648]) {
      const response = await request('/pemindahbukuan', 'POST', memberCookie, {
        idUserTujuan: 3,
        tipePemindahbukuan: 'tabungan_ke_tabungan',
        nominal,
      })
      expect(response.status).toBe(422)
    }
    expect((await request('/pemindahbukuan', 'POST', memberCookie, {
      idUserTujuan: 3,
      tipePemindahbukuan: 'tabungan_ke_tabungan',
      nominal: 100_000,
    })).status).toBe(201)
    const response = await request('/pemindahbukuan?status=pending', 'GET', memberCookie)
    expect(response.status).toBe(200)
    const list = await response.json()
    expect(list.total).toBe(1)
    expect(list.data[0]).toMatchObject({ sourceMemberName: 'Sumber', destinationMemberName: 'Tujuan', statusApproved: 'pending' })
    const id = list.data[0].id
    expect((await request(`/pemindahbukuan/${id}/approve`, 'PATCH', memberCookie)).status).toBe(403)
    expect((await request(`/pemindahbukuan/${id}/approve`, 'PATCH', adminCookie)).status).toBe(200)
    expect((await request(`/pemindahbukuan/${id}/approve`, 'PATCH', adminCookie)).status).toBe(409)
    const saldo = await request('/simpanan/saldo', 'GET', memberCookie)
    expect(saldo.status).toBe(200)
    expect(await saldo.json()).toMatchObject({ saldoTabungan: 900_000, totalPemindahbukuanPending: 0, jumlahSahamEfektif: 10 })
  })

  test('HTTP rejection and batch cancellation release reservations', async () => {
    const memberCookie = await login(2, 'sumber@test.invalid')
    const adminCookie = await login(1, 'admin@test.invalid')
    const first = await propose(300_000)
    const second = await propose(400_000)
    expect((await request(`/pemindahbukuan/${first.id}/reject`, 'PATCH', memberCookie, { alasanPenolakan: 'Ditolak' })).status).toBe(403)
    expect((await request(`/pemindahbukuan/${first.id}/reject`, 'PATCH', adminCookie, { alasanPenolakan: ' ' })).status).toBe(400)
    expect((await request(`/pemindahbukuan/${first.id}/reject`, 'PATCH', adminCookie, { alasanPenolakan: 'Ditolak' })).status).toBe(200)
    expect((await request('/pemindahbukuan', 'DELETE', memberCookie, { ids: [second.id, second.id] })).status).toBe(422)
    expect((await request('/pemindahbukuan', 'DELETE', memberCookie, { ids: [second.id] })).status).toBe(200)
    expect((await savings.getSaldo(2)).saldoEfektif).toBe(1_000_000)
  })

  test('journal HTTP responses identify the member on each line, not the administrator', async () => {
    const transfer = await propose(100_000, 2, 3, 1)
    await transfers.approvePemindahbukuan(transfer.id, 1)
    const { data: [approved] } = await transfers.getPemindahbukuan(1, query)
    const adminCookie = await login(1, 'admin@test.invalid')
    const response = await request(`/jurnal/${approved.jurnalId}`, 'GET', adminCookie)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).not.toHaveProperty('userId')
    expect(body).not.toHaveProperty('userName')
    expect(body.details).toMatchObject([
      { userId: 2, userName: 'Sumber', debit: 100_000, kredit: 0 },
      { userId: 3, userName: 'Tujuan', debit: 0, kredit: 100_000 },
    ])
    const listResponse = await request('/jurnal', 'GET', adminCookie)
    expect(listResponse.status).toBe(200)
    const list = await listResponse.json()
    expect(list.total).toBe(1)
    expect(list.data).toMatchObject([
      { jurnalId: approved.jurnalId, userId: 2, userName: 'Sumber' },
      { jurnalId: approved.jurnalId, userId: 3, userName: 'Tujuan' },
    ])
  })

  test('manual journals use the logged-in user for every line', async () => {
    const adminCookie = await login(1, 'admin@test.invalid')
    const response = await request('/jurnal', 'POST', adminCookie, {
      tanggalTransaksi: '2026-10-01',
      details: [{ akunId: 1, debit: 100_000, kredit: 0 }, { akunId: 12, debit: 0, kredit: 100_000 }],
    })
    expect(response.status).toBe(201)
    const [header] = await db.select().from(jurnal)
    const result = await journals.getJurnalById(header.id)
    expect(result).not.toHaveProperty('userId')
    expect(result.details.map(row => [row.userId, row.userName])).toEqual([[1, 'Admin'], [1, 'Admin']])
    const relatedUser = await db.query.user.findFirst({ where: { id: 1 }, with: { jurnalDetails: true } })
    expect(relatedUser?.jurnalDetails).toHaveLength(2)
    const relatedDetail = await db.query.jurnalDetail.findFirst({ with: { user: true } })
    expect(relatedDetail?.user?.id).toBe(1)
  })

  test('savings submitted by PJ or admin keep the member on cash, savings, shares, and premium lines', async () => {
    await savings.createSetoran(4, { userId: 2, jenisSimpanan: 'tabungan', akunId: 1, nilaiTransaksi: 100_000 })
    await savings.createSetoran(1, { userId: 3, jenisSimpanan: 'saham', akunId: 1, jumlahSaham: 2 })
    await savings.createPenarikan(4, { userId: 2, akunId: 1, nilaiTransaksi: 50_000 })
    const mutations = await db.select().from(mutasiSimpanan)
    for (const mutation of mutations) {
      await savings.approveMutasi(mutation.id, 1)
    }
    const approved = await db.select().from(mutasiSimpanan)
    for (const mutation of approved) {
      const result = await journals.getJurnalById(mutation.jurnalId!)
      expect(new Set(result.details.map(row => row.userId))).toEqual(new Set([mutation.userId]))
      expect(result.details.some(row => row.akunId === 1)).toBe(true)
      if (mutation.jenisSimpanan === 'saham') {
        expect(result.details.map(row => row.akunId)).toEqual([1, 19, 50])
      }
    }
  })

  test('discounted share deposits attribute all lines to the member', async () => {
    await db.insert(masterSchema.saham).values({ hargaNominal: 50_000, hargaJual: 40_000, updatedBy: 1 })
    await savings.createSetoran(1, { userId: 2, jenisSimpanan: 'saham', akunId: 1, jumlahSaham: 2 })
    const [mutation] = await db.select().from(mutasiSimpanan)
    await savings.approveMutasi(mutation.id, 1)
    const details = await db.select().from(jurnalDetail)
    expect(details.map(row => [row.akunId, row.userId, row.debit, row.kredit])).toEqual([[1, 2, 80_000, 0], [19, 2, 0, 100_000], [50, 2, 20_000, 0]])
  })

  test('conversion rejects another member and PJ/admin can convert only within the same member', async () => {
    for (const actor of [2, 4, 1]) {
      await expect(transfers.createPemindahbukuan(actor, {
        idUserSumber: 2,
        idUserTujuan: 3,
        tipePemindahbukuan: 'tabungan_ke_saham',
        jumlahSaham: 1,
      })).rejects.toMatchObject({ code: 'INVALID_CONVERSION_DESTINATION_ERROR' })
    }
    expect(await db.$count(pemindahbukuan)).toBe(0)
    for (const actor of [4, 1]) {
      await transfers.createPemindahbukuan(actor, {
        idUserSumber: 2,
        idUserTujuan: 2,
        tipePemindahbukuan: 'tabungan_ke_saham',
        jumlahSaham: 1,
      })
    }
    const { data } = await transfers.getPemindahbukuan(1, query)
    for (const transfer of data) {
      await transfers.approvePemindahbukuan(transfer.id, 1)
    }
    expect((await db.select().from(jurnalDetail)).every(row => row.userId === 2)).toBe(true)
    expect(await balance(2)).toMatchObject({ saldoTabungan: 880_000, jumlahSaham: 12 })
  })

  test('approval refuses legacy pending conversions to another member', async () => {
    await transfers.createPemindahbukuan(2, { idUserTujuan: 2, tipePemindahbukuan: 'tabungan_ke_saham', jumlahSaham: 1 })
    const { data: [transfer] } = await transfers.getPemindahbukuan(1, query)
    await db.update(pemindahbukuan).set({ idUserTujuan: 3 }).where(eq(pemindahbukuan.id, transfer.id))
    await expect(transfers.approvePemindahbukuan(transfer.id, 1)).rejects.toMatchObject({ code: 'INVALID_CONVERSION_DESTINATION_ERROR' })
    expect(await balance(2)).toMatchObject({ saldoTabungan: 1_000_000, jumlahSaham: 10 })
    expect((await transfers.getPemindahbukuan(1, query)).data[0].statusApproved).toBe('pending')
    expect(await db.$count(jurnal)).toBe(0)
  })

  test('legacy migration preserves line owners, enforces constraints, removes header ownership, and can be rerun', async () => {
    await db.execute(sql`ALTER TABLE jurnal ADD COLUMN user_id integer NOT NULL REFERENCES "user" (id)`)
    await db.execute(sql`ALTER TABLE jurnal_detail DROP COLUMN user_id`)
    await db.$client`
      INSERT INTO jurnal (id, kode_transaksi, tanggal_transaksi, user_id) VALUES
      (1, 'OLD-MANUAL', '2026-10-01', 1),
      (2, 'OLD-DEPOSIT', '2026-10-01', 2),
      (3, 'OLD-TRANSFER', '2026-10-01', 2),
      (4, 'OLD-SHARES', '2026-10-01', 2),
      (5, 'OLD-CONVERSION', '2026-10-01', 2),
      (6, 'OLD-SELF-CONVERSION', '2026-10-01', 2)
    `
    await db.$client`
      INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES
      (1, 1, 100000, 0), (1, 12, 0, 100000),
      (2, 1, 100000, 0), (2, 12, 0, 100000),
      (3, 12, 100000, 0), (3, 12, 0, 100000),
      (4, 19, 100000, 0), (4, 19, 0, 100000),
      (5, 12, 80000, 0), (5, 19, 0, 100000), (5, 50, 20000, 0),
      (6, 12, 120000, 0), (6, 19, 0, 100000), (6, 50, 0, 20000)
    `
    await db.insert(pemindahbukuan).values([
      { kodeTransaksi: 'OLD-PBK-1', idUserSumber: 2, idUserTujuan: 3, akunIdSumber: 12, akunIdTujuan: 12, nominal: 100_000, tipePemindahbukuan: 'tabungan_ke_tabungan', jurnalId: 3, tanggalTransaksi: '2026-10-01', statusApproved: 'approved', createdBy: 4 },
      { kodeTransaksi: 'OLD-PBK-2', idUserSumber: 2, idUserTujuan: 3, akunIdSumber: 19, akunIdTujuan: 19, nominal: 100_000, jumlahSaham: 2, tipePemindahbukuan: 'saham_ke_saham', jurnalId: 4, tanggalTransaksi: '2026-10-01', statusApproved: 'approved', createdBy: 1 },
      { kodeTransaksi: 'OLD-PBK-3', idUserSumber: 2, idUserTujuan: 3, akunIdSumber: 12, akunIdTujuan: 19, nominal: 80_000, jumlahSaham: 2, tipePemindahbukuan: 'tabungan_ke_saham', jurnalId: 5, tanggalTransaksi: '2026-10-01', statusApproved: 'approved', createdBy: 1 },
      { kodeTransaksi: 'OLD-PBK-4', idUserSumber: 2, idUserTujuan: 2, akunIdSumber: 12, akunIdTujuan: 19, nominal: 120_000, jumlahSaham: 2, tipePemindahbukuan: 'tabungan_ke_saham', jurnalId: 6, tanggalTransaksi: '2026-10-01', statusApproved: 'approved', createdBy: 1 },
    ])
    const migration = await Bun.file(new URL('../src/database/migrations/20261001_move_jurnal_user_to_detail.sql', import.meta.url)).text()
    async function migrate() {
      await db.$client.begin(async (tx) => {
        await tx.unsafe(migration).simple()
      })
    }
    await migrate()
    const details = await db.select().from(jurnalDetail).orderBy(jurnalDetail.id)
    expect(details.map(row => row.userId)).toEqual([1, 1, 2, 2, 2, 3, 2, 3, 2, 3, 3, 2, 2, 2])
    expect(details.map(row => [row.debit, row.kredit])).toEqual([[100_000, 0], [0, 100_000], [100_000, 0], [0, 100_000], [100_000, 0], [0, 100_000], [100_000, 0], [0, 100_000], [80_000, 0], [0, 100_000], [20_000, 0], [120_000, 0], [0, 100_000], [0, 20_000]])
    const columns = await db.$client`
      SELECT table_name, column_name, is_nullable FROM information_schema.columns
      WHERE table_schema = ${schemaName} AND column_name = 'user_id'
        AND table_name IN ('jurnal', 'jurnal_detail')
    `
    expect(columns.map(row => [row.table_name, row.is_nullable])).toEqual([['jurnal_detail', 'NO']])
    await expect(db.$client`INSERT INTO jurnal_detail (jurnal_id, akun_id, debit) VALUES (1, 1, 1)`.execute()).rejects.toMatchObject({ code: '23502' })
    await expect(db.$client`INSERT INTO jurnal_detail (jurnal_id, akun_id, user_id, debit) VALUES (1, 1, 99999, 1)`.execute()).rejects.toMatchObject({ code: '23503' })
    await migrate()
    expect((await db.select().from(jurnalDetail).orderBy(jurnalDetail.id)).map(row => row.userId)).toEqual(details.map(row => row.userId))
  })

  test('pending reserves funds; approval moves funds exactly once and protects its balanced journal', async () => {
    const transfer = await propose(300_000)
    expect(transfer.kodeTransaksi).toMatch(/^PBK-\d{8}-001$/)
    expect(transfer.statusApproved).toBe('pending')
    expect(transfer.akunIdSumber).toBe(12)
    expect(transfer.akunIdTujuan).toBe(12)
    expect((await balance(2)).saldoTabungan).toBe(1_000_000)
    expect(await savings.getSaldo(2)).toMatchObject({ totalPemindahbukuanPending: 300_000, saldoEfektif: 700_000 })

    const results = await Promise.allSettled([
      transfers.approvePemindahbukuan(transfer.id, 1),
      transfers.approvePemindahbukuan(transfer.id, 1),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect((await balance(2)).saldoTabungan).toBe(700_000)
    expect((await balance(3)).saldoTabungan).toBe(500_000)
    expect(await savings.getSaldo(2)).toMatchObject({ totalPemindahbukuanPending: 0, saldoEfektif: 700_000 })
    const [header] = await db.select().from(jurnal)
    const details = await db.select().from(jurnalDetail)
    expect(header).not.toHaveProperty('userId')
    expect(details.map(row => [row.akunId, row.userId, row.debit, row.kredit])).toEqual([[12, 2, 300_000, 0], [12, 3, 0, 300_000]])
    await expect(journals.deleteJurnal([header.id])).rejects.toMatchObject({ code: 'AUTO_JURNAL_IMMUTABLE_ERROR' })
  })

  test('pending withdrawals and transfers share a reservation budget in both directions', async () => {
    await savings.createPenarikan(2, { akunId: 1, nilaiTransaksi: 400_000 })
    await expect(propose(700_000)).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE_ERROR' })
    const transfer = await propose(500_000)
    await expect(savings.createPenarikan(2, { akunId: 1, nilaiTransaksi: 200_000 })).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE_ERROR' })
    expect(await savings.getSaldo(2)).toMatchObject({ totalPenarikanPending: 400_000, totalPemindahbukuanPending: 500_000, saldoEfektif: 100_000 })
    const [withdrawal] = await db.select().from(mutasiSimpanan)
    await savings.approveMutasi(withdrawal.id, 1)
    await transfers.approvePemindahbukuan(transfer.id, 1)
    expect((await balance(2)).saldoTabungan).toBe(100_000)
  })

  test('concurrent withdrawal and transfer cannot reserve the same funds', async () => {
    const results = await Promise.allSettled([
      propose(800_000),
      savings.createPenarikan(2, { akunId: 1, nilaiTransaksi: 800_000 }),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect((await savings.getSaldo(2)).saldoEfektif).toBe(200_000)
  })

  test('share transfers reserve whole shares and move them without repricing', async () => {
    await transfers.createPemindahbukuan(2, { idUserTujuan: 3, tipePemindahbukuan: 'saham_ke_saham', jumlahSaham: 7 })
    const { data: [transfer] } = await transfers.getPemindahbukuan(2, query)
    expect(transfer).toMatchObject({ nominal: 350_000, hargaPerSaham: 50_000, agioSaham: 0 })
    expect(await savings.getSaldo(2)).toMatchObject({ jumlahSaham: 10, totalSahamPending: 7, jumlahSahamEfektif: 3 })
    await expect(transfers.createPemindahbukuan(2, { idUserTujuan: 3, tipePemindahbukuan: 'saham_ke_saham', jumlahSaham: 4 })).rejects.toMatchObject({ code: 'INSUFFICIENT_SHARES_ERROR' })
    await transfers.approvePemindahbukuan(transfer.id, 1)
    expect((await balance(2)).jumlahSaham).toBe(3)
    expect((await balance(3)).jumlahSaham).toBe(9)
    expect((await balance(2)).saldoTabungan).toBe(1_000_000)
    const journal = await journals.getJurnalById((await transfers.getPemindahbukuan(2, query)).data[0].jurnalId!)
    expect(journal.details.map(row => row.userId)).toEqual([2, 3])
  })

  test('self-conversion uses the captured selling price and records premium', async () => {
    await transfers.createPemindahbukuan(2, { idUserTujuan: 2, tipePemindahbukuan: 'tabungan_ke_saham', jumlahSaham: 2 })
    const { data: [transfer] } = await transfers.getPemindahbukuan(2, query)
    expect(transfer).toMatchObject({ nominal: 120_000, hargaPerSaham: 60_000, hargaNominalPerSaham: 50_000, agioSaham: 20_000 })
    await db.insert(masterSchema.saham).values({ hargaNominal: 50_000, hargaJual: 90_000, updatedBy: 1 })
    await transfers.approvePemindahbukuan(transfer.id, 1)
    expect(await balance(2)).toMatchObject({ saldoTabungan: 880_000, jumlahSaham: 12 })
    const details = await db.select().from(jurnalDetail)
    expect(details.map(row => [row.akunId, row.userId, row.debit, row.kredit])).toEqual([[12, 2, 120_000, 0], [19, 2, 0, 100_000], [50, 2, 0, 20_000]])
  })

  test('self-conversion records a discount on the debit side for the same member', async () => {
    await db.insert(masterSchema.saham).values({ hargaNominal: 50_000, hargaJual: 40_000, updatedBy: 1 })
    await transfers.createPemindahbukuan(2, { idUserTujuan: 2, tipePemindahbukuan: 'tabungan_ke_saham', jumlahSaham: 2 })
    const { data: [transfer] } = await transfers.getPemindahbukuan(2, query)
    await transfers.approvePemindahbukuan(transfer.id, 1)
    expect(await balance(2)).toMatchObject({ saldoTabungan: 920_000, jumlahSaham: 12 })
    expect((await balance(3)).jumlahSaham).toBe(2)
    const details = await db.select().from(jurnalDetail)
    expect(details.map(row => [row.akunId, row.userId, row.debit, row.kredit])).toEqual([[12, 2, 80_000, 0], [19, 2, 0, 100_000], [50, 2, 20_000, 0]])
  })

  test('source access is enforced, and the recipient may belong to another group', async () => {
    await expect(propose(100_000, 3, 2, 2)).rejects.toMatchObject({ code: 'PENGGUNA_ACCESS_DENIED_ERROR' })
    await expect(propose(100_000, 3, 2, 4)).rejects.toMatchObject({ code: 'PENGGUNA_ACCESS_DENIED_ERROR' })
    const transfer = await propose(100_000, 2, 3, 4)
    expect(transfer.createdBy).toBe(4)
    await db.delete(kelompokSchema.kelompokPenanggungJawab)
    await expect(propose(100_000, 2, 3, 4)).rejects.toMatchObject({ code: 'PENGGUNA_ACCESS_DENIED_ERROR' })
    await expect(transfers.deletePemindahbukuan(4, [transfer.id])).rejects.toMatchObject({ code: 'PEMINDAHBUKUAN_NOT_DELETED_ERROR' })
  })

  test('list visibility includes incoming transfers and applies filters, pagination, and access', async () => {
    const first = await propose(100_000)
    const second = await propose(200_000, 2, 5, 1)
    expect((await transfers.getPemindahbukuan(2, query)).total).toBe(2)
    expect((await transfers.getPemindahbukuan(3, query)).data.map(row => row.id)).toEqual([first.id])
    expect((await transfers.getPemindahbukuan(4, query)).total).toBe(2)
    expect((await transfers.getPemindahbukuan(5, query)).data.map(row => row.id)).toEqual([second.id])
    expect((await transfers.getPemindahbukuan(1, { ...query, userId: 3 })).total).toBe(1)
    await expect(transfers.getPemindahbukuan(2, { ...query, userId: 5 })).rejects.toMatchObject({ code: 'PENGGUNA_ACCESS_DENIED_ERROR' })
    expect((await transfers.getPemindahbukuan(1, { ...query, page: 2, limit: 1 })).data[0].id).toBe(first.id)
    expect((await transfers.getPemindahbukuan(1, { ...query, search: second.kodeTransaksi })).total).toBe(1)
    await transfers.rejectPemindahbukuan(first.id, 1, ' Ditolak ')
    expect((await transfers.getPemindahbukuan(1, { ...query, status: 'pending' })).total).toBe(1)
    expect((await transfers.getPemindahbukuan(1, { ...query, tipePemindahbukuan: 'saham_ke_saham' })).total).toBe(0)
  })

  test('rejection releases the reservation and requires a reason; processed records are immutable', async () => {
    const transfer = await propose(900_000)
    await expect(transfers.rejectPemindahbukuan(transfer.id, 1, ' ')).rejects.toMatchObject({ code: 'INVALID_REJECTION_REASON_ERROR' })
    expect((await savings.getSaldo(2)).saldoEfektif).toBe(100_000)
    await transfers.rejectPemindahbukuan(transfer.id, 1, ' Ditolak ')
    expect((await savings.getSaldo(2)).saldoEfektif).toBe(1_000_000)
    expect((await transfers.getPemindahbukuan(2, query)).data[0]).toMatchObject({ alasanPenolakan: 'Ditolak', approvedBy: 1 })
    await expect(transfers.approvePemindahbukuan(transfer.id, 1)).rejects.toMatchObject({ code: 'PEMINDAHBUKUAN_ALREADY_PROCESSED_ERROR' })
    await expect(transfers.rejectPemindahbukuan(transfer.id, 1, 'Ulang')).rejects.toMatchObject({ code: 'PEMINDAHBUKUAN_ALREADY_PROCESSED_ERROR' })
    await expect(transfers.deletePemindahbukuan(2, [transfer.id])).rejects.toMatchObject({ code: 'PEMINDAHBUKUAN_NOT_DELETED_ERROR' })
    expect(await db.$count(jurnal)).toBe(0)
  })

  test('cancellation is atomic, source/creator-only, releases reservations, and preserves code sequence', async () => {
    const first = await propose(400_000, 2, 3, 4)
    const second = await propose(400_000)
    await expect(transfers.deletePemindahbukuan(3, [first.id])).rejects.toMatchObject({ code: 'PEMINDAHBUKUAN_NOT_DELETED_ERROR' })
    await expect(transfers.deletePemindahbukuan(2, [first.id, 999_999])).rejects.toMatchObject({ code: 'PEMINDAHBUKUAN_NOT_DELETED_ERROR' })
    expect((await savings.getSaldo(2)).saldoEfektif).toBe(200_000)
    await db.delete(transactionSchema.transactionCodeCounter)
    await transfers.deletePemindahbukuan(4, [first.id])
    await transfers.deletePemindahbukuan(2, [second.id])
    expect((await savings.getSaldo(2)).saldoEfektif).toBe(1_000_000)
    expect((await propose()).kodeTransaksi).toMatch(/-003$/)
  })

  test('same-type self-transfers and nonmember endpoints are rejected', async () => {
    await expect(propose(1, 2, 2)).rejects.toMatchObject({ code: 'INVALID_TRANSFER_DESTINATION_ERROR' })
    await expect(transfers.createPemindahbukuan(2, { idUserTujuan: 2, tipePemindahbukuan: 'saham_ke_saham', jumlahSaham: 1 })).rejects.toMatchObject({ code: 'INVALID_TRANSFER_DESTINATION_ERROR' })
    await expect(propose(1, 2, 6)).rejects.toMatchObject({ code: 'NOT_MEMBER_ERROR' })
    await expect(propose(1, 1, 2, 1)).rejects.toMatchObject({ code: 'NOT_MEMBER_ERROR' })
  })

  test('missing prices and inactive ledger accounts leave no reservation', async () => {
    await db.delete(masterSchema.saham)
    await expect(transfers.createPemindahbukuan(2, { idUserTujuan: 2, tipePemindahbukuan: 'tabungan_ke_saham', jumlahSaham: 1 })).rejects.toMatchObject({ code: 'HARGA_SAHAM_NOT_FOUND_ERROR' })
    await db.update(akunSchema.akun).set({ isActive: false }).where(eq(akunSchema.akun.id, 12))
    await expect(propose()).rejects.toMatchObject({ code: 'INVALID_ACCOUNT_ERROR' })
    expect(await db.$count(pemindahbukuan)).toBe(0)
    expect((await savings.getSaldo(2)).saldoEfektif).toBe(1_000_000)
  })

  test('approval rechecks accounts and available balance, rolling back when either is invalid', async () => {
    const transfer = await propose(300_000)
    await db.update(akunSchema.akun).set({ isActive: false }).where(eq(akunSchema.akun.id, 12))
    await expect(transfers.approvePemindahbukuan(transfer.id, 1)).rejects.toMatchObject({ code: 'INVALID_ACCOUNT_ERROR' })
    expect((await balance(2)).saldoTabungan).toBe(1_000_000)
    await db.update(akunSchema.akun).set({ isActive: true }).where(eq(akunSchema.akun.id, 12))
    await db.update(saldoSimpanan).set({ saldoTabungan: 200_000 }).where(eq(saldoSimpanan.userId, 2))
    await expect(transfers.approvePemindahbukuan(transfer.id, 1)).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE_ERROR' })
    expect((await balance(3)).saldoTabungan).toBe(200_000)
    expect((await transfers.getPemindahbukuan(2, query)).data[0].statusApproved).toBe('pending')
    expect(await db.$count(jurnal)).toBe(0)
  })

  test('destination overflow rolls back the debit, approval, and journal', async () => {
    const transfer = await propose(100_000)
    await db.update(saldoSimpanan).set({ saldoTabungan: 2_147_483_647 }).where(eq(saldoSimpanan.userId, 3))
    await expect(transfers.approvePemindahbukuan(transfer.id, 1)).rejects.toMatchObject({ code: 'AMOUNT_OVERFLOW_ERROR' })
    expect((await balance(2)).saldoTabungan).toBe(1_000_000)
    expect((await transfers.getPemindahbukuan(2, query)).data[0].statusApproved).toBe('pending')
    expect(await db.$count(jurnal)).toBe(0)
  })

  test('opposite-direction approvals avoid deadlocks and preserve total funds', async () => {
    const forward = await propose(100_000)
    const backward = await propose(50_000, 3, 2)
    await Promise.all([
      transfers.approvePemindahbukuan(forward.id, 1),
      transfers.approvePemindahbukuan(backward.id, 1),
    ])
    expect((await balance(2)).saldoTabungan).toBe(950_000)
    expect((await balance(3)).saldoTabungan).toBe(250_000)
    expect(await db.$count(jurnal)).toBe(2)
  })

  test('concurrent transfer requests cannot oversubscribe shares or reuse codes', async () => {
    const results = await Promise.allSettled([
      transfers.createPemindahbukuan(2, { idUserTujuan: 3, tipePemindahbukuan: 'saham_ke_saham', jumlahSaham: 8 }),
      transfers.createPemindahbukuan(2, { idUserTujuan: 3, tipePemindahbukuan: 'saham_ke_saham', jumlahSaham: 8 }),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    await Promise.all([propose(10_000), propose(10_000, 3, 2)])
    const list = await transfers.getPemindahbukuan(1, query)
    expect(new Set(list.data.map(row => row.kodeTransaksi)).size).toBe(3)
  })
})
