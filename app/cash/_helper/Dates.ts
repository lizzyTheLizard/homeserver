// TODO: Use temporal everywhere

export function getStartOfMonth(): string {
  const now = new Date()
  return `${String(now.getUTCFullYear())}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`
}

export function get30DaysAgo(): string {
  const now = new Date()
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return `${String(past.getUTCFullYear())}-${String(past.getUTCMonth() + 1).padStart(2, '0')}-${String(past.getUTCDate()).padStart(2, '0')}T00:00:00.000Z`
}

export function get24HoursAgo(): string {
  const now = new Date()
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return `${String(past.getUTCFullYear())}-${String(past.getUTCMonth() + 1).padStart(2, '0')}-${String(past.getUTCDate()).padStart(2, '0')}T${String(past.getUTCHours()).padStart(2, '0')}:${String(past.getUTCMinutes()).padStart(2, '0')}:${String(past.getUTCSeconds()).padStart(2, '0')}.000Z`
}
