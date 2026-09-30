import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema, UnauthorizedSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { idParamsSchema } from '#/utils/schema'
import { penggunaModel } from './model'
import { PenggunaService } from './service'

export const PenggunaModules = new Elysia({ prefix: 'pengguna', tags: ['Pengguna'] })
  .use(AuthMacro)
  .get(
    '/options',
    ({ user }) => PenggunaService.getPenggunaOptions(user.id),
    {
      auth: true,
      response: {
        200: penggunaModel.getPenggunaOptionsResponseSchema,
        401: UnauthorizedSchema,
        404: ErrorSchema,
      },
      detail: {
        description: 'Admin melihat semua pengguna; PJ melihat pengguna dalam kelompok yang ditanggung dan dirinya sendiri; pengguna biasa hanya dirinya sendiri.',
      },
    },
  )
  .get(
    '/profile',
    ({ user }) => PenggunaService.getProfile(user.id),
    {
      auth: true,
      response: {
        200: penggunaModel.getProfileResponseSchema,
        404: ErrorSchema,
      },
    },
  )
  .patch(
    '/profile',
    async ({ user, body }) => {
      await PenggunaService.updateProfile(user.id, body)
      return status(200, { message: 'Success' })
    },
    {
      auth: true,
      body: penggunaModel.updateProfileSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
      },
    },
  )
  .get(
    '/',
    ({ query }) => PenggunaService.getPaginatedPengguna(query),
    {
      admin: true,
      query: penggunaModel.getPenggunaQuerySchema,
      response: {
        200: penggunaModel.getPenggunaResponseSchema,
      },
    },
  )
  .patch(
    '/:id/verifikasi',
    ({ params }) => PenggunaService.verifyPengguna(params.id),
    {
      admin: true,
      params: idParamsSchema,
      response: {
        200: penggunaModel.verifyPenggunaResponseSchema,
        404: ErrorSchema,
        409: ErrorSchema,
      },
    },
  )
  .patch(
    '/:id/pj',
    async ({ params, body }) => {
      await PenggunaService.setPenggunaPj(params.id, body.isPj)
      return status(200, { message: 'Success' })
    },
    {
      admin: true,
      params: idParamsSchema,
      body: penggunaModel.setPjSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
      },
    },
  )
