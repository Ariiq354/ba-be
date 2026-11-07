import { t } from 'elysia'

export const jumlahSahamSchema = t.Number({
  minimum: 0,
  multipleOf: 0.5,
  description: 'Jumlah saham dalam lembar. Pecahan 0,5 hanya untuk kepemilikan lama.',
})

export const paginationSchema = t.Object({
  page: t.Integer({ default: 1, minimum: 1 }),
  limit: t.Integer({ default: 10, minimum: 1 }),
})

export const searchSchema = t.Object({
  search: t.String({ default: '' }),
})

export const idParamsSchema = t.Object({
  id: t.Integer({ minimum: 1 }),
})

export const deleteBulkSchema = t.Object({
  ids: t.Array(t.Integer({ minimum: 1 }), { minItems: 1 }),
})
