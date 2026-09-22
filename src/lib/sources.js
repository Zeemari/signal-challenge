export const SOURCE_TYPES = [
  { value: 'direct_observation', label: 'Direct observation' },
  { value: 'trusted_community', label: 'Trusted community source' },
  { value: 'authority', label: 'Local authority / vigilante report' },
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'secondhand', label: 'Second-hand information' },
  { value: 'unknown', label: 'Unknown' },
]

export function sourceLabel(value) {
  return SOURCE_TYPES.find((s) => s.value === value)?.label ?? 'Unknown'
}

export function isFirsthand(value) {
  return value === 'direct_observation'
}

export const STATUS_META = {
  emerging: {
    label: 'Emerging',
    dot: 'var(--color-status-emerging)',
    bg: '#eaedfd',
    text: '#3b4fc2',
  },
  corroborating: {
    label: 'Corroborating',
    dot: 'var(--color-status-corroborating)',
    bg: '#e6f6ee',
    text: '#1f7a52',
  },
  conflicting: {
    label: 'Conflicting',
    dot: 'var(--color-status-conflicting)',
    bg: '#fdf3dd',
    text: '#92670f',
  },
  unconfirmed: {
    label: 'Unconfirmed',
    dot: 'var(--color-status-unconfirmed)',
    bg: '#eef0f2',
    text: '#52585f',
  },
}
