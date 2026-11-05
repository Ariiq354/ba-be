import Elysia, { status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as ShuModel from './model'
import { ShuService } from './service'

export const ShuRoutes = new Elysia({ prefix: 'shu', tags: ['SHU'] })
  .use(AuthMacro)
  .get(
    '/',
    {
      auth: true,
      query: ShuModel.Get.Query,
      response: ShuModel.Get.Response,
    },
    ({ query, user }) => ShuService.getShu(user, query),
  )
  .get(
    '/referensi',
    {
      admin: true,
      query: ShuModel.ReferensiGet.Query,
      response: ShuModel.ReferensiGet.Response,
    },
    ({ query }) => ShuService.getReferensi(query),
  )
  .post(
    '/pengalihan',
    {
      admin: true,
      body: ShuModel.PengalihanPost.Body,
      response: ShuModel.PengalihanPost.Response,
    },
    async ({ body, user }) => {
      await ShuService.alihkanShu(user.id, body)
      return status(200, { message: 'Success' })
    },
  )
  .post(
    '/',
    {
      admin: true,
      body: ShuModel.Post.Body,
      response: ShuModel.Post.Response,
    },
    async ({ body }) => {
      await ShuService.createShu(body)
      return status(201, { message: 'Success' })
    },
  )
