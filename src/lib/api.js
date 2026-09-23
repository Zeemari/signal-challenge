import { ensureAuth, authState } from './auth.js'

export async function apiFetch(path, options = {}) {
  await ensureAuth()
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (authState.session?.access_token) headers.set('Authorization', `Bearer ${authState.session.access_token}`)
  const response = await fetch(path, { ...options, headers })
  const contentType = response.headers.get('content-type') || ''
  let body = {}
  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => ({}))
  }
  if (!response.ok) {
    const error = new Error(
      body.error || (contentType.includes('application/json') ? 'Something went wrong' : `Unexpected response from server (${response.status})`)
    )
    error.status = response.status
    throw error
  }
  return body
}
