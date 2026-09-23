import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

// Node < 22 has no native WebSocket support, which supabase-js's Realtime
// client requires at construction time even though this app never uses
// Realtime features. Providing the `ws` package as the transport avoids the
// "Node.js detected without native WebSocket support" error.
const realtimeOptions = { transport: ws }

function loadEnvFiles() {
  if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) return
  try {
    const cwd = process.cwd()
    for (const file of ['.env.local', '.env']) {
      const filePath = path.join(cwd, file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim()
            let val = trimmed.slice(eqIdx + 1).trim()
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1)
            }
            if (!process.env[key]) {
              process.env[key] = val
            }
          }
        }
      }
    }
  } catch {}
}

loadEnvFiles()

const getUrl = () => process.env.VITE_SUPABASE_URL
const getAnonKey = () => process.env.VITE_SUPABASE_ANON_KEY

export function createUserClient(accessToken) {
  const url = getUrl()
  const anonKey = getAnonKey()
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    realtime: realtimeOptions,
  })
}

// This client is server-only. Never prefix this environment variable with VITE.
export function getServerClient() {
  const url = getUrl()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getAnonKey()
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase server configuration is missing. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
    )
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: realtimeOptions,
  })
}

export const supabase = getUrl() && getAnonKey()
  ? createClient(getUrl(), getAnonKey(), { realtime: realtimeOptions })
  : null
