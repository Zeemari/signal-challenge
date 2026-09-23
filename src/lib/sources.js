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

export const INSTITUTION_TYPES = [
  { value: 'police_station', label: 'Police station' },
  { value: 'news_outlet', label: 'Verified news outlet' },
  { value: 'newspaper', label: 'Newspaper' },
  { value: 'government_agency', label: 'Government agency' },
  { value: 'ngo', label: 'NGO' },
  { value: 'other', label: 'Other institution' },
]

export function institutionLabel(value) {
  return INSTITUTION_TYPES.find((t) => t.value === value)?.label ?? null
}

export const STATUS_META = {
  unsafe: {
    label: 'UNSAFE',
    description: 'Verified dangerous activity reported',
    dot: '#dc2626',
    bg: '#fef2f2',
    text: '#991b1b',
  },
  dangerous: {
    label: 'UNSAFE',
    description: 'Verified dangerous activity reported',
    dot: '#dc2626',
    bg: '#fef2f2',
    text: '#991b1b',
  },
  emerging: {
    label: 'New',
    description: 'Just started coming in',
    dot: 'var(--color-status-emerging)',
    bg: '#eaedfd',
    text: '#3b4fc2',
  },
  corroborating: {
    label: 'Backed up',
    description: 'Multiple reports agree',
    dot: 'var(--color-status-corroborating)',
    bg: '#e6f6ee',
    text: '#1f7a52',
  },
  conflicting: {
    label: 'Mixed',
    description: 'Reports disagree with each other',
    dot: 'var(--color-status-conflicting)',
    bg: '#fdf3dd',
    text: '#92670f',
  },
  unconfirmed: {
    label: 'Cautious',
    description: 'Single unverified report',
    dot: 'var(--color-status-unconfirmed)',
    bg: '#eef0f2',
    text: '#52585f',
  },
}
