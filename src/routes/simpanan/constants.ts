import { AkunId } from '#/libs/config'

export const PAYMENT_METHODS = ['Transfer', 'Tunai'] as const
export const SHARE_PAYMENT_METHODS = [...PAYMENT_METHODS, 'Tabungan'] as const

export const PAYMENT_ACCOUNTS = {
  Transfer: AkunId.BANKBSM,
  Tunai: AkunId.KAS,
} as const
