import { verifyPassword as verifyScryptPassword } from 'better-auth/crypto'
import { createHash, timingSafeEqual } from 'node:crypto'

function md5(value: string) {
  return createHash('md5').update(value).digest('hex')
}

export function isLegacyPasswordHash(hash: string) {
  return /^[a-f0-9]{32}$/i.test(hash)
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  if (!isLegacyPasswordHash(hash)) {
    return verifyScryptPassword({ hash, password })
  }

  const sha1 = createHash('sha1').update(md5(password)).digest('hex')
  const legacyHash = md5(password + sha1 + md5('zipe354'))

  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(legacyHash, 'hex'))
}
