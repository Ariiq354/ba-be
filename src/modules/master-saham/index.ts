import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { masterSahamModel } from './model'
import { MasterSahamService } from './service'

export const MasterSahamModules = new Elysia({
  prefix: 'master-saham',
  tags: ['Master Saham'],
})
  .use(AuthMacro)
  .get(
    '/',
    async ({ query }) => MasterSahamService.getPaginatedHargaSaham(query),
    {
      admin: true,
      query: masterSahamModel.getHargaSahamQuerySchema,
      response: {
        200: masterSahamModel.getHargaSahamResponseSchema,
        500: ErrorSchema,
      },
    },
  )
  .get(
    '/latest',
    async () => MasterSahamService.getLatestHargaSaham(),
    {
      auth: true,
      response: {
        200: masterSahamModel.getLatestHargaSahamResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .post(
    '/',
    async ({ body, user }) => {
      await MasterSahamService.createHargaSaham(user.id, body)
      return status(201, { message: 'Success' })
    },
    {
      admin: true,
      body: masterSahamModel.createHargaSahamSchema,
      response: {
        201: SuccessSchema,
        500: ErrorSchema,
      },
    },
  )
