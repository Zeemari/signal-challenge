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
  emerging: { label: 'Emerging signal', color: 'var(--color-status-emerging)' },
  corroborating: { label: 'Corroborating reports', color: 'var(--color-status-corroborating)' },
  conflicting: { label: 'Conflicting reports', color: 'var(--color-status-conflicting)' },
  unconfirmed: { label: 'Unconfirmed', color: 'var(--color-status-unconfirmed)' },
}
