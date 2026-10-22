import Elysia, { HTTPError, status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as JurnalModel from './model'
import { JurnalService } from './service'

export const JurnalRoutes = new Elysia({ prefix: 'jurnal', tags: ['Jurnal'] })
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: JurnalModel.Get.Query,
      response: JurnalModel.Get.Response,
    },
    ({ query }) => JurnalService.getPaginatedJurnal(query),
  )
  .get(
    '/:id',
    {
      admin: true,
      params: JurnalModel.ByIdGet.Params,
      response: JurnalModel.ByIdGet.Response,
    },
    ({ params }) => JurnalService.getJurnalById(params.id),
  )
  .post(
    '/',
    {
      admin: true,
      body: JurnalModel.Post.Body,
      response: JurnalModel.Post.Response,
    },
    async ({ body, user }) => {
      await JurnalService.createJurnal(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
  .delete(
    '/',
    {
      admin: true,
      body: JurnalModel.Delete.Body,
      response: JurnalModel.Delete.Response,
    },
    async ({ body }) => {
      const result = await JurnalService.deleteJurnal(body.ids)
      if (result instanceof HTTPError) return result
      return status(200, { message: 'Success' })
    },
  )
