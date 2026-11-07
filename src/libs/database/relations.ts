import { defineRelations } from 'drizzle-orm'

import * as akunKeuanganSchema from './schema/akun'
import * as authSchema from './schema/auth'
import * as filesSchema from './schema/files'
import * as jurnalSchema from './schema/jurnal'
import * as kelompokSchema from './schema/kelompok'
import * as masterSchema from './schema/master'
import * as pembiayaanSchema from './schema/pembiayaan'
import * as shuSchema from './schema/shu'
import * as simpananSchema from './schema/simpanan'
import * as usersSchema from './schema/users'
import * as wilayahSchema from './schema/wilayah'

export const relations = defineRelations(
  {
    ...akunKeuanganSchema,
    ...authSchema,
    ...filesSchema,
    ...jurnalSchema,
    ...kelompokSchema,
    ...masterSchema,
    ...pembiayaanSchema,
    ...shuSchema,
    ...simpananSchema,
    ...usersSchema,
    ...wilayahSchema,
  },
  (r) => ({
    user: {
      sessions: r.many.session({
        from: r.user.id,
        to: r.session.userId,
      }),
      accounts: r.many.account({
        from: r.user.id,
        to: r.account.userId,
      }),
      kelompok: r.one.kelompok({
        from: r.user.idKelompok,
        to: r.kelompok.id,
      }),
      profile: r.one.userProfile({
        from: r.user.id,
        to: r.userProfile.idUser,
      }),
      jurnalDetails: r.many.jurnalDetail({
        from: r.user.id,
        to: r.jurnalDetail.userId,
      }),
      simpananSaldo: r.one.simpananSaldo({
        from: r.user.id,
        to: r.simpananSaldo.userId,
      }),
      shu: r.many.shu({
        from: r.user.id,
        to: r.shu.idUser,
      }),
      simpananRiwayat: r.many.simpananRiwayat({
        from: r.user.id,
        to: r.simpananRiwayat.userId,
      }),
      simpananRiwayatCreated: r.many.simpananRiwayat({
        from: r.user.id,
        to: r.simpananRiwayat.createdBy,
      }),
      simpananRiwayatApproved: r.many.simpananRiwayat({
        from: r.user.id,
        to: r.simpananRiwayat.approvedBy,
      }),
      pemindahbukuanSumber: r.many.pemindahbukuan({
        from: r.user.id,
        to: r.pemindahbukuan.idUserSumber,
      }),
      pemindahbukuanTujuan: r.many.pemindahbukuan({
        from: r.user.id,
        to: r.pemindahbukuan.idUserTujuan,
      }),
      pemindahbukuanCreated: r.many.pemindahbukuan({
        from: r.user.id,
        to: r.pemindahbukuan.createdBy,
      }),
      pemindahbukuanApproved: r.many.pemindahbukuan({
        from: r.user.id,
        to: r.pemindahbukuan.approvedBy,
      }),
      sahamUpdated: r.many.saham({
        from: r.user.id,
        to: r.saham.updatedBy,
      }),
      pembiayaan: r.many.pembiayaan({
        from: r.user.id,
        to: r.pembiayaan.userId,
      }),
      pembiayaanCreated: r.many.pembiayaan({
        from: r.user.id,
        to: r.pembiayaan.createdBy,
      }),
      pembiayaanApproved: r.many.pembiayaan({
        from: r.user.id,
        to: r.pembiayaan.approvedBy,
      }),
      pembiayaanTransferred: r.many.pembiayaan({
        from: r.user.id,
        to: r.pembiayaan.transferredBy,
      }),
      angsuranCreated: r.many.angsuran({
        from: r.user.id,
        to: r.angsuran.createdBy,
      }),
      angsuranApproved: r.many.angsuran({
        from: r.user.id,
        to: r.angsuran.approvedBy,
      }),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },
    userProfile: {
      user: r.one.user({
        from: r.userProfile.idUser,
        to: r.user.id,
      }),
      provinsi: r.one.provinsi({
        from: r.userProfile.idProvinsi,
        to: r.provinsi.id,
      }),
      kota: r.one.kota({
        from: r.userProfile.idKota,
        to: r.kota.id,
      }),
      kecamatan: r.one.kecamatan({
        from: r.userProfile.idKecamatan,
        to: r.kecamatan.id,
      }),
      kelurahan: r.one.kelurahan({
        from: r.userProfile.idKelurahan,
        to: r.kelurahan.id,
      }),
    },
    kelompok: {
      users: r.many.user({
        from: r.kelompok.id,
        to: r.user.idKelompok,
      }),
    },
    akunKeuangan: {
      templateDebit: r.many.templateTransaksi({
        from: r.akunKeuangan.id,
        to: r.templateTransaksi.akunDebitId,
      }),
      templateKredit: r.many.templateTransaksi({
        from: r.akunKeuangan.id,
        to: r.templateTransaksi.akunKreditId,
      }),
      jurnalDetails: r.many.jurnalDetail({
        from: r.akunKeuangan.id,
        to: r.jurnalDetail.akunId,
      }),
      simpananRiwayat: r.many.simpananRiwayat({
        from: r.akunKeuangan.id,
        to: r.simpananRiwayat.akunId,
      }),
      pemindahbukuanSumber: r.many.pemindahbukuan({
        from: r.akunKeuangan.id,
        to: r.pemindahbukuan.akunIdSumber,
      }),
      pemindahbukuanTujuan: r.many.pemindahbukuan({
        from: r.akunKeuangan.id,
        to: r.pemindahbukuan.akunIdTujuan,
      }),
      pembiayaan: r.many.pembiayaan({
        from: r.akunKeuangan.id,
        to: r.pembiayaan.akunId,
      }),
      angsuran: r.many.angsuran({
        from: r.akunKeuangan.id,
        to: r.angsuran.akunId,
      }),
    },
    templateTransaksi: {
      akunDebit: r.one.akunKeuangan({
        from: r.templateTransaksi.akunDebitId,
        to: r.akunKeuangan.id,
      }),
      akunKredit: r.one.akunKeuangan({
        from: r.templateTransaksi.akunKreditId,
        to: r.akunKeuangan.id,
      }),
    },
    jurnal: {
      details: r.many.jurnalDetail({
        from: r.jurnal.id,
        to: r.jurnalDetail.jurnalId,
      }),
    },
    jurnalDetail: {
      user: r.one.user({
        from: r.jurnalDetail.userId,
        to: r.user.id,
      }),
      jurnal: r.one.jurnal({
        from: r.jurnalDetail.jurnalId,
        to: r.jurnal.id,
      }),
      akunKeuangan: r.one.akunKeuangan({
        from: r.jurnalDetail.akunId,
        to: r.akunKeuangan.id,
      }),
    },
    shu: {
      user: r.one.user({
        from: r.shu.idUser,
        to: r.user.id,
      }),
    },
    simpananSaldo: {
      user: r.one.user({
        from: r.simpananSaldo.userId,
        to: r.user.id,
      }),
    },
    simpananRiwayat: {
      user: r.one.user({
        from: r.simpananRiwayat.userId,
        to: r.user.id,
      }),
      akunKeuangan: r.one.akunKeuangan({
        from: r.simpananRiwayat.akunId,
        to: r.akunKeuangan.id,
      }),
      creator: r.one.user({
        from: r.simpananRiwayat.createdBy,
        to: r.user.id,
      }),
      approver: r.one.user({
        from: r.simpananRiwayat.approvedBy,
        to: r.user.id,
      }),
    },
    pemindahbukuan: {
      userSumber: r.one.user({
        from: r.pemindahbukuan.idUserSumber,
        to: r.user.id,
      }),
      akunSumber: r.one.akunKeuangan({
        from: r.pemindahbukuan.akunIdSumber,
        to: r.akunKeuangan.id,
      }),
      userTujuan: r.one.user({
        from: r.pemindahbukuan.idUserTujuan,
        to: r.user.id,
      }),
      akunTujuan: r.one.akunKeuangan({
        from: r.pemindahbukuan.akunIdTujuan,
        to: r.akunKeuangan.id,
      }),
      creator: r.one.user({
        from: r.pemindahbukuan.createdBy,
        to: r.user.id,
      }),
      approver: r.one.user({
        from: r.pemindahbukuan.approvedBy,
        to: r.user.id,
      }),
    },
    pembiayaan: {
      akunKeuangan: r.one.akunKeuangan({
        from: r.pembiayaan.akunId,
        to: r.akunKeuangan.id,
      }),
      user: r.one.user({
        from: r.pembiayaan.userId,
        to: r.user.id,
      }),
      creator: r.one.user({
        from: r.pembiayaan.createdBy,
        to: r.user.id,
      }),
      approver: r.one.user({
        from: r.pembiayaan.approvedBy,
        to: r.user.id,
      }),
      transferrer: r.one.user({
        from: r.pembiayaan.transferredBy,
        to: r.user.id,
      }),
      angsuran: r.many.angsuran({
        from: r.pembiayaan.id,
        to: r.angsuran.pembiayaanId,
      }),
    },
    angsuran: {
      akunKeuangan: r.one.akunKeuangan({
        from: r.angsuran.akunId,
        to: r.akunKeuangan.id,
      }),
      pembiayaan: r.one.pembiayaan({
        from: r.angsuran.pembiayaanId,
        to: r.pembiayaan.id,
      }),
      creator: r.one.user({
        from: r.angsuran.createdBy,
        to: r.user.id,
      }),
      approver: r.one.user({
        from: r.angsuran.approvedBy,
        to: r.user.id,
      }),
    },
    saham: {
      updater: r.one.user({
        from: r.saham.updatedBy,
        to: r.user.id,
      }),
    },
    provinsi: {
      kota: r.many.kota({
        from: r.provinsi.id,
        to: r.kota.idProvinsi,
      }),
    },
    kota: {
      provinsi: r.one.provinsi({
        from: r.kota.idProvinsi,
        to: r.provinsi.id,
      }),
      kecamatan: r.many.kecamatan({
        from: r.kota.id,
        to: r.kecamatan.idKota,
      }),
    },
    kecamatan: {
      kota: r.one.kota({
        from: r.kecamatan.idKota,
        to: r.kota.id,
      }),
      kelurahan: r.many.kelurahan({
        from: r.kecamatan.id,
        to: r.kelurahan.idKecamatan,
      }),
    },
    kelurahan: {
      kecamatan: r.one.kecamatan({
        from: r.kelurahan.idKecamatan,
        to: r.kecamatan.id,
      }),
    },
  }),
)
