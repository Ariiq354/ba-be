import Elysia from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as DashboardModel from './model'
import { DashboardService } from './service'

export const DashboardRoutes = new Elysia({
  prefix: 'dashboard',
  tags: ['Dashboard'],
})
  .use(AuthMacro)
  .get(
    '/',
    {
      auth: true,
      response: DashboardModel.Get.Response,
      detail: {
        description:
          'Ringkasan harga jual resmi saham, perubahan dari pencatatan sebelumnya, harga terakhir tiap bulan selama 12 bulan terakhir, serta laba koperasi sejak 1 Januari sampai hari ini (Asia/Jakarta). Harga grafik diteruskan dari bulan sebelumnya jika tidak berubah, dan null sebelum pencatatan pertama. Laba bulanan tidak bersifat kumulatif; bulan berjalan belum final.',
      },
    },
    async () => DashboardService.getDashboard(),
  )
