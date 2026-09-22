export function minutesAgo(isoString) {
  const then = new Date(isoString).getTime()
  return Math.max(0, Math.round((Date.now() - then) / 60000))
}

export function freshnessOf(isoString) {
  const mins = minutesAgo(isoString)
  if (mins <= 15) return { level: 'recent', label: 'Recent', color: 'var(--color-fresh)' }
  if (mins <= 30) return { level: 'aging', label: 'Aging', color: 'var(--color-aging)' }
  return { level: 'stale', label: 'Stale', color: 'var(--color-stale)' }
}

export function formatRelative(isoString) {
  const mins = minutesAgo(isoString)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 minute ago'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`
}

export function formatClock(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
