export function getJakartaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

export function getNextTransactionCode(prefix: string, existingCodes: string[]) {
  const maxSequence = existingCodes.reduce((max, code) => {
    if (!code.startsWith(prefix)) {
      return max
    }

    const suffix = code.slice(prefix.length)
    const sequence = /^\d+$/.test(suffix) ? parseInt(suffix) : 0

    return sequence > max ? sequence : max
  }, 0)

  return `${prefix}${String(maxSequence + 1).padStart(3, '0')}`
}
