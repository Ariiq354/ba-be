import Elysia from 'elysia'

import { AngsuranRoutes } from './angsuran'
import { AngsuranEksternalRoutes } from './angsuran-eksternal'
import { DashboardRoutes } from './dashboard'
import { FilesRoutes } from './files'
import { JurnalRoutes } from './jurnal'
import { KelompokRoutes } from './kelompok'
import { MasterAkunRoutes } from './master-akun'
import { MasterInputTransaksiRoutes } from './master-input-transaksi'
import { MasterMarginRoutes } from './master-margin'
import { MasterSahamRoutes } from './master-saham'
import { PembiayaanRoutes } from './pembiayaan'
import { PembiayaanEksternalRoutes } from './pembiayaan-eksternal'
import { PemindahbukuanRoutes } from './pemindahbukuan'
import { PenggunaRoutes } from './pengguna'
import { ShuRoutes } from './shu'
import { SimpananRoutes } from './simpanan'
import { WilayahRoutes } from './wilayah'

export const Routes = new Elysia({ prefix: 'api/v1' })
  .use(AngsuranRoutes)
  .use(AngsuranEksternalRoutes)
  .use(DashboardRoutes)
  .use(FilesRoutes)
  .use(JurnalRoutes)
  .use(MasterAkunRoutes)
  .use(MasterInputTransaksiRoutes)
  .use(MasterMarginRoutes)
  .use(MasterSahamRoutes)
  .use(KelompokRoutes)
  .use(PenggunaRoutes)
  .use(PembiayaanRoutes)
  .use(PembiayaanEksternalRoutes)
  .use(PemindahbukuanRoutes)
  .use(ShuRoutes)
  .use(SimpananRoutes)
  .use(WilayahRoutes)
