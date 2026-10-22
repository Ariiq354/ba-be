import Elysia, { HTTPError, status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as MasterAkunModel from './model'
import { MasterAkunService } from './service'

export const MasterAkunRoutes = new Elysia({ prefix: 'master-akun', tags: ['Master Akun'] })
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: MasterAkunModel.Get.Query,
      response: MasterAkunModel.Get.Response,
    },
    async ({ query }) => MasterAkunService.getPaginatedAkun(query),
  )
  .post(
    '/',
    {
      admin: true,
      body: MasterAkunModel.Post.Body,
      response: MasterAkunModel.Post.Response,
    },
    async ({ body }) => {
      const result = await MasterAkunService.createAkun(body)
      if (result instanceof HTTPError) return result
      return status(201, { message: 'Success' })
    },
  )
  .patch(
    '/:id',
    {
      admin: true,
      params: MasterAkunModel.ByIdPatch.Params,
      body: MasterAkunModel.ByIdPatch.Body,
      response: MasterAkunModel.ByIdPatch.Response,
    },
    async ({ params, body }) => {
      const result = await MasterAkunService.updateAkun(params.id, body)
      if (result instanceof HTTPError) return result
      return status(200, { message: 'Success' })
    },
  )
  .delete(
    '/',
    {
      admin: true,
      body: MasterAkunModel.Delete.Body,
      response: MasterAkunModel.Delete.Response,
    },
    async ({ body }) => {
      const result = await MasterAkunService.deleteAkun(body.ids)
      if (result instanceof HTTPError) return result
      return status(200, { message: 'Success' })
    },
  )
