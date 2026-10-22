import Elysia, { status } from 'elysia'

import { ErrorSchema, SuccessSchema, UnauthorizedSchema } from '#/libs/errors'
import { idParamsSchema } from '#/libs/schema'
import { AuthMacro } from '#/plugins/macro'

import { penggunaModel } from './model'
import { PenggunaService } from './service'

export const PenggunaRoutes = new Elysia({ prefix: 'pengguna', tags: ['Pengguna'] })
  .use(AuthMacro)
  .get(
    '/options',
    {
      auth: true,
      response: {
        200: penggunaModel.getPenggunaOptionsResponseSchema,
        401: UnauthorizedSchema,
        404: ErrorSchema,
      },
    },
    ({ user }) => PenggunaService.getPenggunaOptions(user.id),
  )
  .get(
    '/profile',
    {
      auth: true,
      response: {
        200: penggunaModel.getProfileResponseSchema,
        404: ErrorSchema,
      },
    },
    ({ user }) => PenggunaService.getProfile(user.id),
  )
  .patch(
    '/profile',
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
    async ({ user, body }) => {
      await PenggunaService.updateProfile(user.id, body)
      return status(200, { message: 'Success' })
    },
  )
  .get(
    '/',
    {
      admin: true,
      query: penggunaModel.getPenggunaQuerySchema,
      response: {
        200: penggunaModel.getPenggunaResponseSchema,
      },
    },
    ({ query }) => PenggunaService.getPaginatedPengguna(query),
  )
  .patch(
    '/:id/verifikasi',
    {
      admin: true,
      params: idParamsSchema,
      response: {
        200: penggunaModel.verifyPenggunaResponseSchema,
        404: ErrorSchema,
        409: ErrorSchema,
      },
    },
    ({ params }) => PenggunaService.verifyPengguna(params.id),
  )
