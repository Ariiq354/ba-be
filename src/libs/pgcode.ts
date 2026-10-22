export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  // Check direct code on error (Postgres.js / direct driver error)
  if ('code' in error && error.code === '23505') {
    return true
  }

  // Check nested code in cause (Drizzle wrapped error)
  if ('cause' in error) {
    const cause = error.cause
    if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505') {
      return true
    }
  }

  return false
}
