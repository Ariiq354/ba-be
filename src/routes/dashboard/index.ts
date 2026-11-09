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
          'Ringkasan harga jual resmi saham dan perubahan dari pencatatan sebelumnya, total pembiayaan approved (pokok + margin, tanpa dikurangi angsuran) serta laba koperasi sejak 1 Januari sampai hari ini (Asia/Jakarta). Grafik pembiayaan approved hanya menghitung pokok, tanpa margin dan tanpa dikurangi angsuran, berdasarkan tanggal pembiayaan. Grafik pembiayaan dan grafik laba disajikan per tahun sejak 2018 sampai hari ini; tahun tanpa data bernilai 0. Grafik tahunan tidak bersifat kumulatif; tahun berjalan belum final.',
      },
    },
    async () => DashboardService.getDashboard(),
  )
