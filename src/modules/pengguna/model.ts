import type { UnwrapSchema } from 'elysia'
import { t } from 'elysia'
import { paginationSchema, searchSchema } from '#/utils/schema'

export const penggunaModel = {
  getProfileResponseSchema: t.Object({
    id: t.Number(),
    name: t.String(),
    email: t.String(),
    image: t.Nullable(t.String()),
    noAnggota: t.Nullable(t.String()),
    noHp: t.Nullable(t.String()),
    nik: t.Nullable(t.String()),
    namaBank: t.Nullable(t.String()),
    noRekening: t.Nullable(t.String()),
    pemilikRekening: t.Nullable(t.String()),
    jalan: t.Nullable(t.String()),
    idProvinsi: t.Nullable(t.String()),
    idKabupatenKota: t.Nullable(t.String()),
    idKecamatan: t.Nullable(t.String()),
    idDesaKelurahan: t.Nullable(t.String()),
  }),

  updateProfileSchema: t.Object({
    name: t.Optional(t.String({ minLength: 1 })),
    imageAction: t.Optional(t.UnionEnum(['keep', 'remove', 'update'])),
    image: t.Optional(t.String({ minLength: 1 })),
    noHp: t.Optional(t.String({ minLength: 1 })),
    nik: t.Optional(t.String({ minLength: 1 })),
    namaBank: t.Optional(t.String({ minLength: 1 })),
    noRekening: t.Optional(t.String({ minLength: 1 })),
    pemilikRekening: t.Optional(t.String({ minLength: 1 })),
    jalan: t.Optional(t.String({ minLength: 1 })),
    idProvinsi: t.Optional(t.String({ minLength: 1 })),
    idKabupatenKota: t.Optional(t.String({ minLength: 1 })),
    idKecamatan: t.Optional(t.String({ minLength: 1 })),
    idDesaKelurahan: t.Optional(t.String({ minLength: 1 })),
  }),

  getPenggunaQuerySchema: t.Object({
    ...paginationSchema.properties,
    ...searchSchema.properties,
    status: t.UnionEnum(['all', 'pending', 'verified'], { default: 'all' }),
  }),

  getPenggunaResponseSchema: t.Object({
    total: t.Number(),
    data: t.Array(
      t.Object({
        id: t.Number(),
        name: t.String(),
        username: t.Nullable(t.String()),
        email: t.String(),
        role: t.Nullable(t.String()),
        banned: t.Nullable(t.Boolean()),
        banReason: t.Nullable(t.String()),
        idKelompok: t.Number(),
        namaKelompok: t.String(),
        kodeKelompok: t.String(),
        noAnggota: t.Nullable(t.String()),
        createdAt: t.Date(),
      }),
    ),
  }),

  setPjSchema: t.Object({
    isPj: t.Boolean(),
  }),

  verifyPenggunaResponseSchema: t.Object({
    noAnggota: t.String(),
  }),
} as const

export type PenggunaModel = {
  [key in keyof typeof penggunaModel]: UnwrapSchema<(typeof penggunaModel)[key]>;
}
