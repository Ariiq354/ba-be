import { defineRelations } from "drizzle-orm";
import * as akunSchema from "./schema/akun";
import * as authSchema from "./schema/auth";
import * as filesSchema from "./schema/files";
import * as jurnalSchema from "./schema/jurnal";
import * as kelompokSchema from "./schema/kelompok";
import * as masterSchema from "./schema/master";
import * as simpananSchema from "./schema/simpanan";
import * as usersSchema from "./schema/users";
import * as wilayahSchema from "./schema/wilayah";

export const relations = defineRelations({
  ...akunSchema,
  ...authSchema,
  ...filesSchema,
  ...jurnalSchema,
  ...kelompokSchema,
  ...masterSchema,
  ...simpananSchema,
  ...usersSchema,
  ...wilayahSchema,
}, r => ({
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
    jurnal: r.many.jurnal({
      from: r.user.id,
      to: r.jurnal.userId,
    }),
    saldoSimpanan: r.one.saldoSimpanan({
      from: r.user.id,
      to: r.saldoSimpanan.userId,
    }),
    mutasiSimpanan: r.many.mutasiSimpanan({
      from: r.user.id,
      to: r.mutasiSimpanan.userId,
    }),
    mutasiSimpananCreated: r.many.mutasiSimpanan({
      from: r.user.id,
      to: r.mutasiSimpanan.createdBy,
    }),
    mutasiSimpananApproved: r.many.mutasiSimpanan({
      from: r.user.id,
      to: r.mutasiSimpanan.approvedBy,
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
    kelompokPenanggungJawab: r.many.kelompokPenanggungJawab({
      from: r.user.id,
      to: r.kelompokPenanggungJawab.userId,
    }),
    sahamUpdated: r.many.saham({
      from: r.user.id,
      to: r.saham.updatedBy,
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
    penanggungJawab: r.many.kelompokPenanggungJawab({
      from: r.kelompok.id,
      to: r.kelompokPenanggungJawab.kelompokId,
    }),
  },
  kelompokPenanggungJawab: {
    kelompok: r.one.kelompok({
      from: r.kelompokPenanggungJawab.kelompokId,
      to: r.kelompok.id,
    }),
    user: r.one.user({
      from: r.kelompokPenanggungJawab.userId,
      to: r.user.id,
    }),
  },
  akun: {
    jurnalDetails: r.many.jurnalDetail({
      from: r.akun.id,
      to: r.jurnalDetail.akunId,
    }),
    mutasiSimpanan: r.many.mutasiSimpanan({
      from: r.akun.id,
      to: r.mutasiSimpanan.akunId,
    }),
    pemindahbukuanSumber: r.many.pemindahbukuan({
      from: r.akun.id,
      to: r.pemindahbukuan.akunIdSumber,
    }),
    pemindahbukuanTujuan: r.many.pemindahbukuan({
      from: r.akun.id,
      to: r.pemindahbukuan.akunIdTujuan,
    }),
  },
  jurnal: {
    user: r.one.user({
      from: r.jurnal.userId,
      to: r.user.id,
    }),
    details: r.many.jurnalDetail({
      from: r.jurnal.id,
      to: r.jurnalDetail.jurnalId,
    }),
  },
  jurnalDetail: {
    jurnal: r.one.jurnal({
      from: r.jurnalDetail.jurnalId,
      to: r.jurnal.id,
    }),
    akun: r.one.akun({
      from: r.jurnalDetail.akunId,
      to: r.akun.id,
    }),
  },
  saldoSimpanan: {
    user: r.one.user({
      from: r.saldoSimpanan.userId,
      to: r.user.id,
    }),
  },
  mutasiSimpanan: {
    user: r.one.user({
      from: r.mutasiSimpanan.userId,
      to: r.user.id,
    }),
    akun: r.one.akun({
      from: r.mutasiSimpanan.akunId,
      to: r.akun.id,
    }),
    creator: r.one.user({
      from: r.mutasiSimpanan.createdBy,
      to: r.user.id,
    }),
    approver: r.one.user({
      from: r.mutasiSimpanan.approvedBy,
      to: r.user.id,
    }),
  },
  pemindahbukuan: {
    userSumber: r.one.user({
      from: r.pemindahbukuan.idUserSumber,
      to: r.user.id,
    }),
    akunSumber: r.one.akun({
      from: r.pemindahbukuan.akunIdSumber,
      to: r.akun.id,
    }),
    userTujuan: r.one.user({
      from: r.pemindahbukuan.idUserTujuan,
      to: r.user.id,
    }),
    akunTujuan: r.one.akun({
      from: r.pemindahbukuan.akunIdTujuan,
      to: r.akun.id,
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
}));
