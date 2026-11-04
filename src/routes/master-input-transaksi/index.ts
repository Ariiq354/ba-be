import Elysia, { status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as MasterInputTransaksiModel from './model'
import { MasterInputTransaksiService } from './service'

export const MasterInputTransaksiRoutes = new Elysia({
  prefix: 'master-input-transaksi',
  tags: ['Master Input Transaksi'],
})
  .use(AuthMacro)
  .get(
    '/options',
    {
      admin: true,
      response: MasterInputTransaksiModel.OptionsGet.Response,
    },
    () => MasterInputTransaksiService.getTemplateOptions(),
  )
  .get(
    '/',
    {
      admin: true,
      query: MasterInputTransaksiModel.Get.Query,
      response: MasterInputTransaksiModel.Get.Response,
    },
    ({ query }) => MasterInputTransaksiService.getPaginatedTemplate(query),
  )
  .post(
    '/',
    {
      admin: true,
      body: MasterInputTransaksiModel.Post.Body,
      response: MasterInputTransaksiModel.Post.Response,
    },
    async ({ body }) => {
      await MasterInputTransaksiService.createTemplate(body)
      return status(201, { message: 'Success' })
    },
  )
  .patch(
    '/:id',
    {
      admin: true,
      params: MasterInputTransaksiModel.ByIdPatch.Params,
      body: MasterInputTransaksiModel.ByIdPatch.Body,
      response: MasterInputTransaksiModel.ByIdPatch.Response,
    },
    async ({ params, body }) => {
      await MasterInputTransaksiService.updateTemplate(params.id, body)
      return status(200, { message: 'Success' })
    },
  )
  .delete(
    '/',
    {
      admin: true,
      body: MasterInputTransaksiModel.Delete.Body,
      response: MasterInputTransaksiModel.Delete.Response,
    },
    async ({ body }) => {
      await MasterInputTransaksiService.deleteTemplate(body.ids)
      return status(200, { message: 'Success' })
    },
  )
