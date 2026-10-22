import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import Elysia, { HTTPError } from 'elysia'

import { app } from '../src/app'
import { auth } from '../src/libs/auth'
import { db } from '../src/libs/database'
import {
  ForbiddenError,
  ItemNotFoundError,
  ItemsNotFoundError,
  PenggunaAccessDeniedError,
  UnauthorizedError,
} from '../src/libs/errors'
import * as FilesErrors from '../src/routes/files/errors'
import { FilesService } from '../src/routes/files/service'
import * as JurnalErrors from '../src/routes/jurnal/errors'
import { DuplicateKodeAkunError } from '../src/routes/master-akun/errors'
import { MasterAkunService } from '../src/routes/master-akun/service'
import { MasterMarginService } from '../src/routes/master-margin/service'
import { HargaSahamNotFoundError } from '../src/routes/master-saham/errors'
import * as PemindahbukuanErrors from '../src/routes/pemindahbukuan/errors'
import { PemindahbukuanService } from '../src/routes/pemindahbukuan/service'
import * as PenggunaErrors from '../src/routes/pengguna/errors'
import * as SimpananErrors from '../src/routes/simpanan/errors'
import { SimpananService } from '../src/routes/simpanan/service'

const errors = [
  new ItemNotFoundError({ id: 1 }),
  new ItemsNotFoundError({ ids: [1] }),
  new PenggunaAccessDeniedError(),
  new UnauthorizedError(),
  new ForbiddenError(),
  new FilesErrors.InvalidUploadDirectoryError(),
  new FilesErrors.FileTooLargeError({ maxSizeMb: 5 }),
  new FilesErrors.UnsupportedFileTypeError(),
  new JurnalErrors.InvalidJurnalError({ reason: 'invalid_date' }),
  new JurnalErrors.UnbalancedJurnalError({ totalDebit: 10, totalKredit: 20 }),
  new JurnalErrors.AkunNotFoundError({ ids: [1] }),
  new JurnalErrors.InactiveAkunError({ ids: [1] }),
  new JurnalErrors.JurnalNotFoundError({ id: 1 }),
  new JurnalErrors.JurnalsNotFoundError({ ids: [1] }),
  new JurnalErrors.InvalidJurnalIdsError(),
  new JurnalErrors.AutoJurnalsImmutableError({ ids: [1] }),
  new DuplicateKodeAkunError({ kodeAkun: '101' }),
  new HargaSahamNotFoundError(),
  new PemindahbukuanErrors.InvalidTransferDestinationError(),
  new PemindahbukuanErrors.InvalidConversionDestinationError(),
  new PemindahbukuanErrors.InsufficientSharesError(),
  new PemindahbukuanErrors.PemindahbukuanNotFoundError({ id: 1 }),
  new PemindahbukuanErrors.PemindahbukuanAlreadyProcessedError({ id: 1 }),
  new PemindahbukuanErrors.PemindahbukuanNotDeletedError({ ids: [1] }),
  new PenggunaErrors.PenggunaAlreadyVerifiedError({ penggunaId: 1 }),
  new PenggunaErrors.PenggunaNotPendingVerificationError({ penggunaId: 1 }),
  new PenggunaErrors.PenggunaUnverifiedError({ penggunaId: 1 }),
  new PenggunaErrors.PenggunaBannedError({ penggunaId: 1 }),
  new PenggunaErrors.AdminCannotBePjError({ penggunaId: 1 }),
  new PenggunaErrors.ProfileImageRequiredError(),
  new PenggunaErrors.InvalidProfileImageError(),
  new PenggunaErrors.InvalidProfileWilayahError(),
  new PenggunaErrors.KelompokNotFoundError({ idKelompok: 1 }),
  new PenggunaErrors.DuplicateNikError({ nik: '123' }),
  new SimpananErrors.NotMemberError({ userId: 1 }),
  new SimpananErrors.InvalidPaymentAccountError({ akunId: 1 }),
  new SimpananErrors.InvalidAccountError({ akunId: 1 }),
  new SimpananErrors.HargaSahamNotFoundError(),
  new SimpananErrors.InsufficientBalanceError(),
  new SimpananErrors.MutasiSimpananNotFoundError({ id: 1 }),
  new SimpananErrors.MutasiSimpananAlreadyProcessedError({ id: 1 }),
  new SimpananErrors.MutasiSimpananNotDeletedError({ ids: [1] }),
  new SimpananErrors.InvalidRejectionReasonError(),
]

afterEach(() => {
  mock.restore()
})

test.each(errors)('custom error uses native HTTPError and Problem Details: %s', async (error) => {
  expect(error).toBeInstanceOf(HTTPError)
  const errorApp = new Elysia()
    .get('/returned', () => error)
    .get('/thrown', () => {
      throw error
    })

  for (const path of ['/returned', '/thrown']) {
    const response = await errorApp.handle(new Request(`http://localhost${path}`))

    expect(response.status).toBe(error.status)
    expect(response.headers.get('content-type')).toContain('application/problem+json')
    expect(await response.json()).toMatchObject({
      type: error.code,
      code: error.code,
      detail: error.message,
      status: error.status,
      title: expect.any(String),
    })
  }
})

test('protected routes return native unauthorized problems', async () => {
  spyOn(auth.api, 'getSession').mockResolvedValue(null)
  const response = await app.handle(new Request('http://localhost/api/v1/simpanan/saldo'))

  expect(response.status).toBe(401)
  expect(response.headers.get('content-type')).toContain('application/problem+json')
  expect(await response.json()).toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
})

test('file validation returns an error before any database or storage writes', async () => {
  const error = await FilesService.generatePresignedUpload({
    dir: 'invalid-directory',
    filename: 'test.png',
    filesize: 1,
    fileType: 'image/png',
  })

  expect(error).toBeInstanceOf(FilesErrors.InvalidUploadDirectoryError)
})

test('upload controller forwards returned errors instead of wrapping them in 201', async () => {
  const response = await app.handle(
    new Request('http://localhost/api/v1/files/presigned', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dir: 'avatar', filename: 'test.png', filesize: 100_000_000, fileType: 'image/png' }),
    }),
  )

  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ code: 'FILE_TOO_LARGE_ERROR', status: 400 })
})

function login(role = 'admin') {
  const now = new Date()
  spyOn(auth.api, 'getSession').mockResolvedValue({
    session: {
      id: 'test-session',
      token: 'test-token',
      userId: '42',
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: null,
      impersonatedBy: null,
    },
    user: {
      id: '42',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      image: null,
      role,
      banned: false,
      banReason: null,
      banExpires: null,
      username: 'test-user',
      displayUsername: 'Test User',
      noHp: '08123456789',
      idKelompok: 1,
    },
  })
}

function request(path: string, method: string, body: unknown) {
  return app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

test('non-admin requests return native forbidden problems', async () => {
  login('user')
  const response = await app.handle(new Request('http://localhost/api/v1/master-akun/'))

  expect(response.status).toBe(403)
  expect(response.headers.get('content-type')).toContain('application/problem+json')
  expect(await response.json()).toMatchObject({ code: 'FORBIDDEN', status: 403 })
})

test('account creation forwards returned conflicts instead of responding 201', async () => {
  login()
  spyOn(MasterAkunService, 'createAkun').mockResolvedValue(new DuplicateKodeAkunError({ kodeAkun: '101' }))
  const response = await request('/master-akun/', 'POST', {
    kodeAkun: '101',
    namaAkun: 'Kas',
    kategori: 'aktiva',
    normalBalance: 'debit',
  })

  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({ code: 'DUPLICATE_KODE_AKUN_ERROR', status: 409 })
})

test('account updates forward returned not-found errors', async () => {
  login()
  spyOn(MasterAkunService, 'updateAkun').mockResolvedValue(new ItemNotFoundError({ id: 7 }))
  const response = await request('/master-akun/7', 'PATCH', { namaAkun: 'Updated' })

  expect(response.status).toBe(404)
  expect(await response.json()).toMatchObject({ code: 'ITEM_NOT_FOUND_ERROR', status: 404 })
})

test('account deletion forwards returned not-found errors', async () => {
  login()
  spyOn(MasterAkunService, 'deleteAkun').mockResolvedValue(new ItemsNotFoundError({ ids: [7] }))
  const response = await request('/master-akun/', 'DELETE', { ids: [7] })

  expect(response.status).toBe(404)
})

test('margin updates forward returned not-found errors', async () => {
  login()
  spyOn(MasterMarginService, 'updateMargin').mockResolvedValue(new ItemNotFoundError({ id: 7 }))
  const response = await request('/master-margin/7', 'PATCH', { biayaAkad: 100 })

  expect(response.status).toBe(404)
})

test('margin deletion forwards returned not-found errors', async () => {
  login()
  spyOn(MasterMarginService, 'deleteMargin').mockResolvedValue(new ItemsNotFoundError({ ids: [7] }))
  const response = await request('/master-margin/', 'DELETE', { ids: [7] })

  expect(response.status).toBe(404)
})

test('profile validation errors are returned before opening a transaction', async () => {
  login('user')
  const transaction = spyOn(db, 'transaction')
  const response = await request('/pengguna/profile', 'PATCH', { noHp: '08123456789', imageAction: 'update' })

  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ code: 'PROFILE_IMAGE_REQUIRED_ERROR', status: 400 })
  expect(transaction).not.toHaveBeenCalled()
})

test.each(['/simpanan/mutasi/7/reject', '/pemindahbukuan/7/reject'])(
  'invalid rejection does not start a transaction: %s',
  async (path) => {
    login()
    const transaction = spyOn(db, 'transaction')
    const response = await request(path, 'PATCH', { alasanPenolakan: '   ' })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'INVALID_REJECTION_REASON_ERROR', status: 400 })
    expect(transaction).not.toHaveBeenCalled()
  },
)

test('successful writes still return the existing success response', async () => {
  login()
  spyOn(MasterAkunService, 'createAkun').mockResolvedValue(undefined)
  const response = await request('/master-akun/', 'POST', {
    kodeAkun: '101',
    namaAkun: 'Kas',
    kategori: 'aktiva',
    normalBalance: 'debit',
  })

  expect(response.status).toBe(201)
  expect(await response.json()).toEqual({ message: 'Success' })
})

test.each([
  ['simpanan', () => SimpananService.approveMutasi(7, 42), SimpananErrors.MutasiSimpananNotFoundError],
  [
    'pemindahbukuan',
    () => PemindahbukuanService.approvePemindahbukuan(7, 42),
    PemindahbukuanErrors.PemindahbukuanNotFoundError,
  ],
] as const)(
  'transaction failures reject rather than commit an error value: %s',
  async (_name, operation, ErrorClass) => {
    type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
    // Only the initial locked lookup is reached when the transaction target is absent.
    const tx = {
      select: () => ({ from: () => ({ where: () => ({ for: async () => [] }) }) }),
    } as unknown as Transaction
    let committed = false
    let rolledBack = false
    spyOn(db, 'transaction').mockImplementation(async (callback) => {
      try {
        const result = await callback(tx)
        committed = true
        return result
      } catch (error) {
        rolledBack = true
        throw error
      }
    })

    await expect(operation()).rejects.toBeInstanceOf(ErrorClass)
    expect(committed).toBe(false)
    expect(rolledBack).toBe(true)
  },
)

test('docs retain Basic Auth and document Problem Details schemas', async () => {
  const username = process.env.DOCS_USERNAME
  const password = process.env.DOCS_PASSWORD
  process.env.DOCS_USERNAME = 'test-docs'
  process.env.DOCS_PASSWORD = 'test-password'
  try {
    const unauthorized = await app.handle(new Request('http://localhost/api/docs/json'))
    expect(unauthorized.status).toBe(401)
    expect(unauthorized.headers.get('www-authenticate')).toBe('Basic realm="API Documentation"')
    expect(await unauthorized.json()).toMatchObject({ code: 'UNAUTHORIZED', status: 401 })

    const response = await app.handle(
      new Request('http://localhost/api/docs/json', {
        headers: { authorization: `Basic ${btoa('test-docs:test-password')}` },
      }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      paths: {
        '/api/v1/master-akun/': {
          post: {
            responses: {
              '409': {
                content: {
                  'application/json': {
                    schema: {
                      properties: { code: { type: 'string' }, detail: { type: 'string' }, status: { type: 'integer' } },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/auth/get-session': expect.any(Object),
      },
    })
  } finally {
    if (username === undefined) delete process.env.DOCS_USERNAME
    else process.env.DOCS_USERNAME = username
    if (password === undefined) delete process.env.DOCS_PASSWORD
    else process.env.DOCS_PASSWORD = password
  }
})

test('errors after a transaction write attempt still reject the transaction', async () => {
  type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
  let writeAttempted = false
  let committed = false
  const tx = {
    execute: async () => [],
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => {
            writeAttempted = true
            return []
          },
        }),
      }),
    }),
  } as unknown as Transaction
  spyOn(db, 'transaction').mockImplementation(async (callback) => {
    const result = await callback(tx)
    committed = true
    return result
  })

  await expect(MasterAkunService.updateAkun(7, { kodeAkun: '101' })).rejects.toBeInstanceOf(ItemNotFoundError)
  expect(writeAttempted).toBe(true)
  expect(committed).toBe(false)
})

test('error responses preserve production CORS headers', async () => {
  spyOn(auth.api, 'getSession').mockResolvedValue(null)
  const response = await app.handle(
    new Request('http://localhost/api/v1/simpanan/saldo', {
      headers: { origin: 'https://ubberkahamanah.my.id' },
    }),
  )

  expect(response.status).toBe(401)
  expect(response.headers.get('access-control-allow-origin')).toBe('https://ubberkahamanah.my.id')
  expect(response.headers.get('access-control-allow-credentials')).toBe('true')
})

test('production hides unexpected error details but preserves intended business messages', async () => {
  const script = `
    import Elysia from 'elysia'
    import { PenggunaAccessDeniedError } from './src/libs/errors'
    const app = new Elysia()
      .get('/unexpected', () => { throw new Error('private-internal-diagnostic') })
      .get('/business', () => new PenggunaAccessDeniedError())
    const unexpected = await app.handle(new Request('http://localhost/unexpected'))
    const business = await app.handle(new Request('http://localhost/business'))
    console.log(JSON.stringify({ unexpected: await unexpected.json(), business: await business.json() }))
  `
  const child = Bun.spawn([process.execPath, '-e', script], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, NODE_ENV: 'production' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [output, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited])

  expect(exitCode).toBe(0)
  expect(JSON.parse(output)).toMatchObject({
    unexpected: { code: 'internal-server-error', status: 500 },
    business: {
      code: 'PENGGUNA_ACCESS_DENIED_ERROR',
      status: 403,
      detail: 'Tidak memiliki akses ke pengguna tersebut',
    },
  })
  expect(output).not.toContain('private-internal-diagnostic')
})
