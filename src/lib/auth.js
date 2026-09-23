import { reactive } from 'vue'
import { supabase } from './supabase.js'

export const authState = reactive({ session: null, user: null, profile: null, loading: true })

const permissions = {
  citizen: new Set(['reports:create', 'reports:read:own']),
  responder: new Set(['reports:create', 'reports:read:own', 'reports:read:all', 'reports:review', 'reports:verify', 'reports:reject', 'incidents:update']),
  admin: new Set(['reports:create', 'reports:read:own', 'reports:read:all', 'reports:review', 'reports:verify', 'reports:reject', 'incidents:update', 'users:manage', 'roles:manage']),
}

let ready
export function ensureAuth() {
  if (!ready) ready = initialize()
  return ready
}

async function initialize() {
  const { data } = await supabase.auth.getSession()
  await setSession(data.session)
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => setSession(session), 0)
  })
  authState.loading = false
}

async function setSession(session) {
  authState.session = session
  authState.user = session?.user ?? null
  authState.profile = null
  if (session?.user) {
    const { data, error } = await supabase.from('profiles').select('id, display_name, role, is_active').eq('id', session.user.id).maybeSingle()
    if (error) console.error('Failed to load profile:', error)
    authState.profile = data ?? null
  }
}

export function hasPermission(permission) {
  return permissions[authState.profile?.role]?.has(permission) ?? false
}

export function hasRole(role) {
  return authState.profile?.role === role
}

export async function signOut() {
  await supabase.auth.signOut()
  await setSession(null)
}
