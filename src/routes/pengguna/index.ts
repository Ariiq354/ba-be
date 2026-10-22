import Elysia, { HTTPError, status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as PenggunaModel from './model'
import { PenggunaService } from './service'

export const PenggunaRoutes = new Elysia({ prefix: 'pengguna', tags: ['Pengguna'] })
  .use(AuthMacro)
  .get(
    '/options',
    {
      auth: true,
      response: PenggunaModel.OptionsGet.Response,
    },
    ({ user }) => PenggunaService.getPenggunaOptions(user.id),
  )
  .get(
    '/profile',
    {
      auth: true,
      response: PenggunaModel.ProfileGet.Response,
    },
    ({ user }) => PenggunaService.getProfile(user.id),
  )
  .patch(
    '/profile',
    {
      auth: true,
      body: PenggunaModel.ProfilePatch.Body,
      response: PenggunaModel.ProfilePatch.Response,
    },
    async ({ user, body }) => {
      const result = await PenggunaService.updateProfile(user.id, body)
      if (result instanceof HTTPError) return result
      return status(200, { message: 'Success' })
    },
  )
  .get(
    '/',
    {
      admin: true,
      query: PenggunaModel.Get.Query,
      response: PenggunaModel.Get.Response,
    },
    ({ query }) => PenggunaService.getPaginatedPengguna(query),
  )
  .patch(
    '/:id/verifikasi',
    {
      admin: true,
      params: PenggunaModel.ByIdVerifikasiPatch.Params,
      response: PenggunaModel.ByIdVerifikasiPatch.Response,
    },
    ({ params }) => PenggunaService.verifyPengguna(params.id),
  )
