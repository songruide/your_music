export function getLimit(value, fallback) {
  const limit = Number(value)

  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback
  }

  return limit
}

export function getOffset(value) {
  const offset = Number(value)

  if (!Number.isFinite(offset) || offset < 0) {
    return 0
  }

  return Math.floor(offset)
}
