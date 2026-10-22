import Elysia, { HTTPError, status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as MasterMarginModel from './model'
import { MasterMarginService } from './service'

export const MasterMarginRoutes = new Elysia({
  prefix: 'master-margin',
  tags: ['Master Margin'],
})
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: MasterMarginModel.Get.Query,
      response: MasterMarginModel.Get.Response,
    },
    async ({ query }) => MasterMarginService.getPaginatedMargin(query),
  )
  .post(
    '/',
    {
      admin: true,
      body: MasterMarginModel.Post.Body,
      response: MasterMarginModel.Post.Response,
    },
    async ({ body }) => {
      await MasterMarginService.createMargin(body)
      return status(201, { message: 'Success' })
    },
  )
  .patch(
    '/:id',
    {
      admin: true,
      params: MasterMarginModel.ByIdPatch.Params,
      body: MasterMarginModel.ByIdPatch.Body,
      response: MasterMarginModel.ByIdPatch.Response,
    },
    async ({ params, body }) => {
      const result = await MasterMarginService.updateMargin(params.id, body)
      if (result instanceof HTTPError) return result
      return status(200, { message: 'Success' })
    },
  )
  .delete(
    '/',
    {
      admin: true,
      body: MasterMarginModel.Delete.Body,
      response: MasterMarginModel.Delete.Response,
    },
    async ({ body }) => {
      const result = await MasterMarginService.deleteMargin(body.ids)
      if (result instanceof HTTPError) return result
      return status(200, { message: 'Success' })
    },
  )
