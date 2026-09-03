import { t } from 'elysia'

export const paginationSchema = t.Object({
  page: t.Number({ default: 1 }),
  limit: t.Number({ default: 10 }),
})

export const searchSchema = t.Object({
  search: t.String({ default: '' }),
})

export const idParamsSchema = t.Object({
  id: t.Number(),
})

export const deleteBulkSchema = t.Object({
  ids: t.Array(t.Number()),
})
