import Elysia, { status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as PembiayaanModel from './model'
import { PembiayaanService } from './service'

export const PembiayaanRoutes = new Elysia({ prefix: 'pembiayaan', tags: ['Pembiayaan'] })
  .use(AuthMacro)
  .get(
    '/options',
    {
      auth: true,
      query: PembiayaanModel.OptionsGet.Query,
      response: PembiayaanModel.OptionsGet.Response,
      detail: {
        description:
          'Pilihan pembiayaan approved yang belum lunas untuk userId wajib, tanpa pagination. Admin dapat memilih semua anggota; PJ dirinya dan anggota kelompoknya; anggota hanya dirinya. Menyertakan total tagihan, sisa tagihan, angsuran bulanan, dan sisa pembayaran bulan ini berdasarkan pembayaran approved. Target bulanan kumulatif dimulai satu bulan setelah tanggal akad, pada tanggal yang sama atau akhir bulan jika lebih pendek, menggunakan tanggal Jakarta dan berhenti bertambah setelah tenor berakhir. Pembayaran pending tidak mengurangi tagihan.',
      },
    },
    ({ user, query }) => PembiayaanService.getPembiayaanOptions(user.id, query),
  )
  .get(
    '/',
    {
      auth: true,
      query: PembiayaanModel.Get.Query,
      response: PembiayaanModel.Get.Response,
      detail: {
        description:
          'Admin melihat semua pembiayaan; PJ melihat dirinya dan anggota kelompoknya; anggota hanya miliknya. userId memfilter anggota dalam cakupan akses tersebut. statusTransfer memfilter belum_transfer atau sudah_transfer berdasarkan waktu pencatatan transfer. Tanggal pembiayaan baru terisi saat akad disetujui.',
      },
    },
    ({ user, query }) => PembiayaanService.getPembiayaan(user.id, query),
  )
  .get(
    '/pending-count',
    {
      admin: true,
      response: PembiayaanModel.PendingCountGet.Response,
    },
    () => PembiayaanService.getPendingCount(),
  )
  .post(
    '/simulasi-margin',
    {
      auth: true,
      body: PembiayaanModel.SimulasiMarginPost.Body,
      response: PembiayaanModel.SimulasiMarginPost.Response,
      detail: {
        description:
          'Simulasi margin tanpa menyimpan data dan tanpa pembatasan peran. Jika jumlahPokok tidak dikirim, respons kosong tanpa mencari master margin. Jika persenMarginTahun dikirim, langsung menggunakan persen tersebut tanpa mencari master margin. Jika tidak dikirim, persen mengikuti master margin berdasarkan jumlah pokok. Jika jangkaWaktuBulan belum dikirim, jumlahMargin tidak disertakan. Jika diisi, margin flat tahunan dikalikan tenor bulan/12 dan dibulatkan ke rupiah terdekat.',
      },
    },
    ({ body }) => PembiayaanService.simulasiMargin(body),
  )
  .post(
    '/',
    {
      auth: true,
      body: PembiayaanModel.Post.Body,
      response: PembiayaanModel.Post.Response,
      detail: {
        description:
          'Mengajukan pembiayaan pending. Input admin dianggap sudah transfer dan langsung membuat jurnal wakalah (debit Uang Muka Pembelian, kredit Kas/BSI). Input anggota/PJ menunggu aksi transfer admin tanpa jurnal. Master margin dan biaya akad otomatis berdasarkan jumlah pokok; persenMarginTahun opsional khusus admin dan harus bilangan bulat. Margin flat tahunan dikalikan tenor bulan/12, dibulatkan ke rupiah terdekat, lalu dikunci bersama biaya akad. Tanggal pengajuan dan transfer otomatis Jakarta; tanggal akad pembiayaan belum diisi sampai approval.',
      },
    },
    async ({ user, body }) => {
      await PembiayaanService.createPembiayaan(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
  .delete(
    '/',
    {
      auth: true,
      body: PembiayaanModel.Delete.Body,
      response: PembiayaanModel.Delete.Response,
      detail: {
        description:
          'Membatalkan pending yang belum transfer, milik sendiri atau yang dibuat sendiri untuk anggota yang masih dapat diakses. Pengajuan yang sudah ditransfer tidak dapat dihapus. Jika satu ID tidak valid, seluruh penghapusan dibatalkan.',
      },
    },
    async ({ user, body }) => {
      await PembiayaanService.deletePembiayaan(user.id, body.ids)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/:id/transfer',
    {
      admin: true,
      params: PembiayaanModel.ByIdTransferPatch.Params,
      response: PembiayaanModel.ByIdTransferPatch.Response,
      detail: {
        description:
          'Mencatat transfer dana wakalah untuk pengajuan pending yang belum transfer. Khusus admin, tanpa body. Membuat satu header jurnal debit Uang Muka Pembelian dan kredit Kas/BSI sebesar pokok, menggunakan kode transaksi pembiayaan. Tanggal transfer otomatis Jakarta saat aksi dilakukan. Jurnal dan status transfer disimpan atomik; transfer tidak dapat diulang. Belum mengaktifkan pembiayaan atau angsuran.',
      },
    },
    async ({ user, params }) => {
      await PembiayaanService.transferPembiayaan(params.id, user.id)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/:id/approve',
    {
      admin: true,
      params: PembiayaanModel.ByIdApprovePatch.Params,
      response: PembiayaanModel.ByIdApprovePatch.Response,
      detail: {
        description:
          'Menyetujui akad pembiayaan setelah pembelian barang. Wajib sudah transfer: mencatat piutang pokok + margin, kredit Uang Muka Pembelian sebesar pokok, serta margin ditangguhkan, tanpa mencairkan dana lagi. Tanggal akad otomatis Jakarta saat approval dan menjadi awal perhitungan angsuran. Pembiayaan dan biaya akad digabung dalam satu header jurnal dengan kode transaksi yang sama dengan jurnal wakalah, sehingga total dua header jurnal. Biaya akad dicatat sebagai penerimaan Kas/Bank dan pendapatan administrasi akad, tanpa mengurangi pokok atau menambah tagihan. Semua jurnal dan status disimpan atomik; transaksi yang sudah diproses tidak dapat diproses ulang.',
      },
    },
    async ({ user, params }) => {
      await PembiayaanService.approvePembiayaan(params.id, user.id)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/:id/reject',
    {
      admin: true,
      params: PembiayaanModel.ByIdRejectPatch.Params,
      body: PembiayaanModel.ByIdRejectPatch.Body,
      response: PembiayaanModel.ByIdRejectPatch.Response,
      detail: {
        description:
          'Menolak pengajuan pending yang belum transfer, dengan alasan wajib diisi. Pengajuan yang sudah ditransfer tidak dapat ditolak melalui aksi ini karena dana sudah keluar.',
      },
    },
    async ({ user, params, body }) => {
      await PembiayaanService.rejectPembiayaan(params.id, user.id, body.alasanPenolakan)
      return status(200, { message: 'Success' })
    },
  )
