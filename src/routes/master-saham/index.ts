import Elysia, { status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as MasterSahamModel from './model'
import { MasterSahamService } from './service'

export const MasterSahamRoutes = new Elysia({
  prefix: 'master-saham',
  tags: ['Master Saham'],
})
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: MasterSahamModel.Get.Query,
      response: MasterSahamModel.Get.Response,
    },
    async ({ query }) => MasterSahamService.getPaginatedHargaSaham(query),
  )
  .get(
    '/latest',
    {
      auth: true,
      response: MasterSahamModel.LatestGet.Response,
    },
    async () => MasterSahamService.getLatestHargaSaham(),
  )
  .get(
    '/realtime',
    {
      auth: true,
      response: MasterSahamModel.RealtimeGet.Response,
      detail: {
        description:
          'Estimasi harga saham dari modal nominal, agio bersih, laba ditahan, dan 10% laba tahun berjalan sampai hari ini. Tidak digunakan sebagai harga transaksi. Bernilai null jika belum ada saham beredar.',
      },
    },
    async () => MasterSahamService.getRealtimeHargaSaham(),
  )
  .post(
    '/',
    {
      admin: true,
      body: MasterSahamModel.Post.Body,
      response: MasterSahamModel.Post.Response,
    },
    async ({ body, user }) => {
      await MasterSahamService.createHargaSaham(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
